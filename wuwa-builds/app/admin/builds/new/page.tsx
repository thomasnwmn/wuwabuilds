import BuildForm from "@/components/BuildForm"

export default function NewBuildPage() {
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <h1 style={{ fontSize: "2rem", margin: 0, fontWeight: 500, color: "#fff" }}>Create New Build</h1>
      </div>
      <BuildForm />
    </div>
  )
}
