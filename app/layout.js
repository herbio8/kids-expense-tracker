import "./globals.css";

export const metadata = {
  title: "Kids Expense Tracker",
  description: "Education and aftercare expense tracking",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text">{children}</body>
    </html>
  );
}
