"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
export function AuthGuard({children}:{children:React.ReactNode}){const router=useRouter();const[ok,setOk]=React.useState(false);React.useEffect(()=>{supabase.auth.getUser().then(({data})=>{if(!data.user)router.replace("/");else setOk(true)})},[router]);if(!ok)return <div className="flex min-h-screen items-center justify-center"><LoaderCircle className="size-6 animate-spin"/></div>;return <>{children}</>}
