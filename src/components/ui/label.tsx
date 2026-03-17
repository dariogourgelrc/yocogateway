"use client";

import { LabelHTMLAttributes, forwardRef } from "react";

const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement>
>(({ className = "", ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={`block text-sm font-medium text-gray-700 ${className}`}
      {...props}
    />
  );
});

Label.displayName = "Label";
export { Label };
