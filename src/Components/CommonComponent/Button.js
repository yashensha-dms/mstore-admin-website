import React from "react";
import { RiLoader4Line } from "react-icons/ri";

const Button = ({
  children,
  type = "button",
  variant = "primary", // 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'primary-outline'
  size = "md", // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = "left", // 'left' | 'right'
  className = "",
  onClick,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
  
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover focus:ring-primary/50 shadow-sm border border-transparent",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-300 border border-transparent",
    outline: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-200",
    "primary-outline": "bg-transparent border border-primary text-primary hover:bg-primary/5 focus:ring-primary/50",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm border border-transparent",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-50 focus:ring-slate-100 border border-transparent",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
    md: "px-4 py-2 text-sm rounded-xl gap-2",
    lg: "px-5 py-2.5 text-base rounded-xl gap-2.5",
  };

  const buttonClasses = `${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClasses}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <RiLoader4Line className="animate-spin shrink-0" size={size === "sm" ? 14 : 18} />
      ) : Icon && iconPosition === "left" ? (
        <Icon className="shrink-0" size={size === "sm" ? 14 : 18} />
      ) : null}
      
      {children}
      
      {!loading && Icon && iconPosition === "right" && (
        <Icon className="shrink-0" size={size === "sm" ? 14 : 18} />
      )}
    </button>
  );
};

export default Button;
