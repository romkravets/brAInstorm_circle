import "./globals.css";

export const metadata = {
  title: "Brainstorm Circle",
  description: "Колективний мозковий штурм з кількома AI в одному вікні",
};

export default function RootLayout({ children }) {
  return (
    <html lang="uk" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
