import "./globals.css";

export const metadata = {
  title: "무한의 계단 - Infinite Stairs",
  description: "두 개의 버튼으로 끊임없이 계단을 오르는 중독성 있는 2D 아케이드 게임!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0D0D1A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
