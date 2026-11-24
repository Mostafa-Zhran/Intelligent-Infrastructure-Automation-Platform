import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Modern Cloud & DevOps Core Brand Logo
 * Features an infinity automation loop merging into interconnected cloud nodes
 */
export const BrandLogo: React.FC<IconProps> = ({ className = 'w-5 h-5', size }) => {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="brand-core-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="45%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      {/* DevOps Infinity Cloud Automation Ribbon */}
      <path
        d="M10 11C6.68629 11 4 13.6863 4 17C4 20.3137 6.68629 23 10 23C13.5 23 16 17 16 17C16 17 18.5 11 22 11C25.3137 11 28 13.6863 28 17C28 20.3137 25.3137 23 22 23C18.5 23 16 17 16 17C16 17 13.5 11 10 11Z"
        stroke="url(#brand-core-grad)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Interconnected Cloud Automation Nodes */}
      <circle cx="10" cy="17" r="2.2" fill="#22D3EE" />
      <circle cx="22" cy="17" r="2.2" fill="#C084FC" />
      <circle cx="16" cy="17" r="1.6" fill="#FFFFFF" />
    </svg>
  );
};

/**
 * Cloud Workload / Project Service Icon
 * Modern interconnected infrastructure workload node with bus channels
 */
export const ProjectIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    >
      {/* Microservice Container Core */}
      <rect x="7" y="7" width="10" height="10" rx="3" strokeWidth="2" />
      {/* Telemetry & Orchestration Bus Interconnects */}
      <path d="M12 2v5" />
      <path d="M12 17v5" />
      <path d="M2 12h5" />
      <path d="M17 12h5" />
      {/* Center Quantum Node */}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
};
