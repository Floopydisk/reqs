import Image from "next/image";

export default function HomeScreens() {
  return (
    <div className="relative flex flex-col w-screen h-screen bg-[#0F1E7A] justify-center items-center gap-3">
      <div
        style={{ filter: "grayscale(1)", opacity: 0.2 }}
        className="absolute inset-0 bg-[url('/daystar_bg.png')] bg-center bg-contain bg-no-repeat bg-blend-soft-light"
      ></div>
      <Image
        width={60}
        height={40}
        alt="daystar-logo"
        src="/daystar_logo.png"
        className="object-cover relative z-10"
      />
      <p className="text-7xl text-white font-bold relative z-10">requisite</p>
    </div>
  );
}
