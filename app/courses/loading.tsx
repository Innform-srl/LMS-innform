export default function CoursesLoading() {
    return (
        <div className="flex h-[50vh] w-full items-center justify-center">
            <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full border-4 border-muted opacity-20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>
        </div>
    )
}
