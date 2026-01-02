import { CreateModuleForm } from "./create-module-form"

export default async function CreateModulePage({ params }: { params: Promise<{ courseId: string }> }) {
    const { courseId } = await params

    return <CreateModuleForm courseId={courseId} />
}
