import React from "react";
import { MdOutlineNavigateNext, MdOutlineNavigateBefore } from "react-icons/md";

/**
 * Reusable Pagination Component
 * 
 * @param {number} currentPage - Current active page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {function} onPageChange - Callback when page changes: (newPage) => void
 * @param {number} totalItems - Optional: Total count of items for display
 * @param {boolean} showInfo - Optional: Show page info text (default: true)
 * @param {string} size - Optional: Size variant 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} variant - Optional: Style variant 'default' | 'minimal' | 'rounded' (default: 'default')
 * @param {boolean} disabled - Optional: Disable all pagination controls
 */
const Pagination = ({
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    totalItems = null,
    showInfo = true,
    size = "md",
    variant = "default",
    disabled = false,
}) => {
    // Size classes
    const sizeClasses = {
        sm: {
            container: "px-3 py-2",
            text: "text-xs",
            button: "px-2 py-1",
            icon: 16,
        },
        md: {
            container: "px-4 py-3",
            text: "text-sm",
            button: "px-3 py-1.5",
            icon: 20,
        },
        lg: {
            container: "px-5 py-4",
            text: "text-base",
            button: "px-4 py-2",
            icon: 24,
        },
    };

    // Variant classes
    const variantClasses = {
        default: "border-t bg-white",
        minimal: "bg-gray-50",
        rounded: "border rounded-lg bg-white",
    };

    const currentSize = sizeClasses[size] || sizeClasses.md;
    const currentVariant = variantClasses[variant] || variantClasses.default;

    // Handle page change
    const handlePrevious = () => {
        if (currentPage > 1 && !disabled) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages && !disabled) {
            onPageChange(currentPage + 1);
        }
    };

    // Don't render if no pages
    if (totalPages <= 0) return null;

    return (
        <div
            className={`flex items-center justify-between ${currentSize.container} ${currentVariant}`}
        >
            {/* Left: Page info */}
            {showInfo && (
                <div className={`${currentSize.text} text-gray-600`}>
                    Page <span className="font-medium">{currentPage}</span> of{" "}
                    <span className="font-medium">{totalPages}</span>
                    {totalItems !== null && (
                        <span className="ml-2 text-gray-500">
                            ({totalItems} total items)
                        </span>
                    )}
                </div>
            )}

            {/* Right: Navigation Controls */}
            <div className="flex items-center gap-2">
                {/* Previous Button */}
                <button
                    disabled={currentPage === 1 || disabled}
                    onClick={handlePrevious}
                    className={`
                        ${currentSize.button} 
                        border rounded-md 
                        ${currentSize.text}
                        transition-colors
                        ${
                            currentPage === 1 || disabled
                                ? "text-gray-400 cursor-not-allowed bg-gray-50"
                                : "hover:bg-gray-100 text-gray-700"
                        }
                    `}
                    title="Previous page"
                >
                    <MdOutlineNavigateBefore size={currentSize.icon} />
                </button>

                {/* Next Button */}
                <button
                    disabled={currentPage === totalPages || disabled}
                    onClick={handleNext}
                    className={`
                        ${currentSize.button} 
                        border rounded-md 
                        ${currentSize.text}
                        transition-colors
                        ${
                            currentPage === totalPages || disabled
                                ? "text-gray-400 cursor-not-allowed bg-gray-50"
                                : "hover:bg-gray-100 text-gray-700"
                        }
                    `}
                    title="Next page"
                >
                    <MdOutlineNavigateNext size={currentSize.icon} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
