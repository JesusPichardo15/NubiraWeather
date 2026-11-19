import Link from "next/link";

export default function NotFound() {
  return <div className="card empty-state">
    <h1>No encontramos esa página</h1>
    <p className="subtle">Puedes volver a explorar o consultar tus eventos desde la navegación.</p>
    <Link href="/" className="button primary">Volver al inicio</Link>
  </div>;
}
