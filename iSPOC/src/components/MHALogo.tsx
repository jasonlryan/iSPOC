import React from "react";
// Import statements for the logo images
import mhaIspoc from "../assets/mha_ispoc.png";
import logoWhite from "../assets/mha-logo-white.png";
import logoPink from "../assets/mha-logo-pink.png";
import logoBlue from "../assets/mha-logo-blue.png";

type LogoVariant = "white" | "pink" | "blue" | "arch" | "ispoc";
type LogoSize = "sm" | "md" | "lg";

interface MHALogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  showTagline?: boolean;
  className?: string;
}

export const MHALogo: React.FC<MHALogoProps> = ({
  variant = "ispoc",
  size = "md",
  showTagline = false,
  className = "",
}) => {
  // Size mappings - adjusted to maintain aspect ratio
  const sizeClasses = {
    sm: "max-w-[50px]",
    md: "max-w-[75px]",
    lg: "max-w-[90px]",
  };

  // Additional size increase for blue logo
  if (variant === "blue") {
    sizeClasses.sm = "max-w-[60px]";
    sizeClasses.md = "max-w-[90px]";
    sizeClasses.lg = "max-w-[108px]";
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
      case "ispoc":
        return mhaIspoc;
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
        return mhaIspoc;
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="flex">
        <img
          src={getLogoSrc()}
          alt={`MHA Logo ${variant}`}
          className={`${sizeClasses[size]} h-auto w-auto object-contain`}
        />
      </div>

      {/* Tagline - only show for non-ispoc variants since ispoc already has text */}
      {showTagline && variant !== "ispoc" && (
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
