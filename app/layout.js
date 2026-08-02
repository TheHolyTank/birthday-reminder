import { Inter, Fredoka } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fredoka",
});

export const metadata = {
  title: "Birthday Reminder",
  description: "Never forget a friend's birthday again.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${fredoka.variable} min-h-screen bg-neutral-50 font-sans text-neutral-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
