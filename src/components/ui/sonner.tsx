import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      duration={3500}
      toastOptions={{
        classNames: {
          toast:
            "group toast font-sans group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lift group-[.toaster]:rounded-2xl group-[.toaster]:px-4 group-[.toaster]:py-3.5",
          title: "text-sm font-semibold",
          description: "group-[.toast]:text-muted-foreground",
          success: "[&_[data-icon]]:text-completed-strong",
          error: "[&_[data-icon]]:text-destructive",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
