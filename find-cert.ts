import { db } from "./lib/db"

async function findCert() {
    const cert = await db.certificate.findFirst({
        where: { certificateNumber: "CERT-2025-272214" }
    })
    console.log(cert)
}

findCert()
