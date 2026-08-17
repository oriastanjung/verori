type Props = {
  title: string;
  description: string;
};

export function AuthHeader({ title, description }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-[2rem] leading-[1.1] font-700 tracking-[-0.02em]">
        {title}
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
