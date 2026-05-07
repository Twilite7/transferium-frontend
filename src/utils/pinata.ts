const JWT = import.meta.env.VITE_PINATA_JWT as string

export async function uploadPortrait(file: File): Promise<string> {
  if (!JWT) throw new Error("VITE_PINATA_JWT not set")

  const form = new FormData()
  form.append("file", file)
  form.append("pinataMetadata", JSON.stringify({ name: `transferium-portrait-${Date.now()}` }))
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }))

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method:  "POST",
    headers: { Authorization: `Bearer ${JWT}` },
    body:    form,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Pinata upload failed: ${err}`)
  }

  const data = await res.json()
  return data.IpfsHash as string
}
