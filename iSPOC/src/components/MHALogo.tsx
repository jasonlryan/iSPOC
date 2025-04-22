import React from "react";
// Import statements for the logo images
// Note: Using only the available logo files
import logoWhite from "../assets/mha-logo-white.png";
import logoPink from "../assets/mha-logo-pink.png";
import logoBlue from "../assets/mha-logo-blue.png";

type LogoVariant = "white" | "pink" | "blue" | "arch";
type LogoSize = "sm" | "md" | "lg";

interface MHALogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  showTagline?: boolean;
  className?: string;
}

export const MHALogo: React.FC<MHALogoProps> = ({
  variant = "white",
  size = "md",
  showTagline = false,
  className = "",
}) => {
  // Size mappings - increased by 150%
  const sizeClasses = {
    sm: "h-16",
    md: "h-24",
    lg: "h-32",
  };

  // Additional size increase for blue logo
  if (variant === "blue") {
    sizeClasses.sm = "h-20";
    sizeClasses.md = "h-28";
    sizeClasses.lg = "h-36";
  }

  // Tagline size mappings
  const taglineSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  // Get the appropriate logo image based on variant
  const getLogoSrc = () => {
    switch (variant) {
      case "white":
        return logoWhite;
      case "pink":
        return logoPink;
      case "blue":
        return logoBlue;
      case "arch":
        // Fallback to white logo for arch variant
        return logoWhite;
      default:
        return logoWhite;
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex">
        <img
          src={getLogoSrc()}
          alt={`MHA Logo ${variant}`}
          className={`${sizeClasses[size]} w-auto`}
        />
      </div>

      {/* Tagline */}
      {showTagline && (
        <span
          className={`${taglineSizeClasses[size]} font-medium text-mha-blue mt-1`}
        >
          Live later life well
        </span>
      )}
    </div>
  );
};

export default MHALogo;
