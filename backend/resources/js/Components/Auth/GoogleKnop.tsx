/** "Inloggen met Google" with the "Of ga verder met" divider above it; a plain link, the server starts the OAuth flow. */
export default function GoogleKnop({ href, label = 'Inloggen met Google' }: { href: string; label?: string }) {
    return (
        <>
            <div className="relative flex py-6 items-center">
                <div className="flex-grow border-t border-zinc-800"></div>
                <span className="flex-shrink mx-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Of ga verder met</span>
                <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            <a
                href={href}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-200 font-semibold text-sm transition-all duration-200 group"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.95H1.18v3.15C3.17 21.32 7.23 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.25c-.25-.72-.38-1.49-.38-2.25s.13-1.53.38-2.25V6.6H1.18C.43 8.12 0 9.81 0 12s.43 3.88 1.18 5.4l4.1-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.17 2.68 1.18 6.6l4.1 3.15c.95-2.84 3.6-4.95 6.72-4.95z" />
                </svg>
                <span className="group-hover:text-white transition-colors">{label}</span>
            </a>
        </>
    );
}
