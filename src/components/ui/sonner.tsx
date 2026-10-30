"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: "!bg-card !border-border !text-foreground !rounded-xl",
          description: "!text-muted-foreground",
        },
      }}
      offset={{ bottom: 24 }}
      mobileOffset={{ bottom: 84 }}
      {...props}
    />
  );
}

export { Toaster };
