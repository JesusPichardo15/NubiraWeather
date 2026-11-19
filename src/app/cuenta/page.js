import Account from "@/components/Account";

export const metadata = { title: "Cuenta" };

export default async function AccountPage({ searchParams }) {
  return <Account passwordChanged={(await searchParams).actualizada === "1"} />;
}
