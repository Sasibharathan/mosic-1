import type { ReactNode } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";

type PageMetaProps = {
  title?: string;
  description?: string;
};

export default function PageMeta({ title, description }: PageMetaProps) {
  return (
    <Helmet>
      {title ? <title>{title}</title> : null}
      {description ? <meta name="description" content={description} /> : null}
    </Helmet>
  );
}

export function AppWrapper({ children }: { children: ReactNode }) {
  return <HelmetProvider>{children}</HelmetProvider>;
}

