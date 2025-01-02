export function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center space-x-2 animate-pulse">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
        </div>
    );
} 
