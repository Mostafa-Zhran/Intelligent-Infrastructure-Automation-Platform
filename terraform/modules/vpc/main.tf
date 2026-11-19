# ==============================================================================
# AWS VPC Module for Kubernetes (EKS) Target
# Implements: AWS-01 (VPC, Subnets, Routing, and Security Boundaries)
# ==============================================================================

# 1. VPC Resource
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(
    var.tags,
    {
      Name                                          = "${var.name_prefix}-vpc"
      Environment                                   = var.environment
      "kubernetes.io/cluster/${var.cluster_name}"   = "shared"
    }
  )
}

# 2. Internet Gateway for Public Internet Ingress/Egress
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-igw"
      Environment = var.environment
    }
  )
}

# 3. Public Subnets (2 AZs for Load Balancers)
resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(
    var.tags,
    {
      Name                                          = "${var.name_prefix}-public-${var.availability_zones[count.index]}"
      Environment                                   = var.environment
      "kubernetes.io/role/elb"                      = "1"
      "kubernetes.io/cluster/${var.cluster_name}"   = "shared"
    }
  )
}

# 4. Private Subnets (2 AZs for Kubernetes Worker Nodes)
resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(
    var.tags,
    {
      Name                                          = "${var.name_prefix}-private-${var.availability_zones[count.index]}"
      Environment                                   = var.environment
      "kubernetes.io/role/internal-elb"             = "1"
      "kubernetes.io/cluster/${var.cluster_name}"   = "shared"
    }
  )
}

# 5. Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-nat-eip"
      Environment = var.environment
    }
  )

  depends_on = [aws_internet_gateway.igw]
}

# 6. NAT Gateway (Single NAT Gateway for MVP Cost Optimization in Dev)
resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-nat-gw"
      Environment = var.environment
    }
  )

  depends_on = [aws_internet_gateway.igw]
}

# 7. Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-public-rt"
      Environment = var.environment
    }
  )
}

# 8. Private Route Table (routes via NAT Gateway)
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-private-rt"
      Environment = var.environment
    }
  )
}

# 9. Route Table Associations
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
