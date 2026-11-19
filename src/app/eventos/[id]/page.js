import { notFound } from "next/navigation";
import { SavedEvent } from "@/components/Events";

export const metadata = { title: "Evento guardado" };

export default async function EventPage({ params, searchParams }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) notFound();
  return <SavedEvent id={id} saved={(await searchParams).guardado === "1"} />;
}
