import { redirect } from "next/navigation";

/** The public experience is the dedicated Vite marketing application in /app. */
export default function Home() { redirect("/site/"); }
