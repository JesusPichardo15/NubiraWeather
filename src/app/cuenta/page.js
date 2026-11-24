import Account from "@/components/Account";

export const metadata = { title: "Cuenta" };

export default async function AccountPage({ searchParams }) {
  const params = await searchParams;
  return <Account passwordChanged={params.actualizada === "1"} continueEvaluation={params.continuar === "1"} />;
}
