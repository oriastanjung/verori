export default function PublicLayout({ children }: LayoutProps<"/">) {
  return <main className="mx-auto w-full max-w-4xl px-6 py-8">{children}</main>;
}
