import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Intelligent Infrastructure Automation Platform (IIAP)
 * Brand Logo — Autonomous Infrastructure Nexus
 * 
 * Embodies:
 * 1. Modular Cloud Architecture (Isometric 3-facet cluster)
 * 2. Automated Pipeline Delivery (Integrated telemetry conduits)
 * 3. AI Core Intelligence (Central luminous quantum spark)
 */
export const BrandLogo: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => {
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
        {/* Top Facet: Cloud & Declarative IaC Plane */}
        <linearGradient id="iiap-facet-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>

        {/* Left Facet: Container Engine & Compute Layer */}
        <linearGradient id="iiap-facet-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#9333EA" />
        </linearGradient>

        {/* Right Facet: Automated Delivery & Telemetry Pipeline */}
        <linearGradient id="iiap-facet-right" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="60%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        {/* Glow filter for the central AI nexus */}
        <filter id="iiap-core-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Top Segment — Cloud Infrastructure Layer */}
      <path
        d="M16 3.5L26.5 9.5L16 14.5L5.5 9.5Z"
        fill="url(#iiap-facet-top)"
      />
      {/* Top segment directional flow accent */}
      <path
        d="M12 9.2L16 11.5L20 9.2"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.5"
      />

      {/* Left Segment — Autonomous Container Core */}
      <path
        d="M4.5 11L14.5 16V27L4.5 21.5Z"
        fill="url(#iiap-facet-left)"
      />
      {/* Left segment vertical telemetry bus */}
      <path
        d="M9.5 14.8V22.2"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.35"
      />

      {/* Right Segment — CI/CD Pipeline Orchestrator */}
      <path
        d="M17.5 16L27.5 11V21.5L17.5 27Z"
        fill="url(#iiap-facet-right)"
      />
      {/* Right segment delivery trace */}
      <path
        d="M22.5 14.8V22.2"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.35"
      />

      {/* Central Intelligent AI Nexus Star */}
      <g filter="url(#iiap-core-glow)">
        <path
          d="M16 11.8L17.5 15L20.5 16L17.5 17L16 20.2L14.5 17L11.5 16L14.5 15Z"
          fill="#FFFFFF"
        />
        <circle cx="16" cy="16" r="1.2" fill="#22D3EE" />
      </g>
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
