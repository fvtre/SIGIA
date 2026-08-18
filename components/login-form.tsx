"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
export function LoginForm(){const router=useRouter();const[email,setEmail]=React.useState("");const[password,setPassword]=React.useState("");const[name,setName]=React.useState("");const[show,setShow]=React.useState(false);const[loading,setLoading]=React.useState(false);const[signup,setSignup]=React.useState(false)
 React.useEffect(()=>{supabase.auth.getUser().then(({data})=>{if(data.user)router.replace('/dashboard')})},[router])
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setLoading(true);try{if(signup){const{data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});if(error)throw error;if(data.session){toast.success("Cuenta creada");router.push('/dashboard')}else toast.success("Cuenta creada. Revisa tu correo si Supabase solicita confirmación.")}else{const{error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;toast.success("Sesión iniciada");router.push('/dashboard')}}catch(e:any){toast.error(e.message||"No fue posible autenticar") }finally{setLoading(false)}}
 return <form onSubmit={submit} className="flex flex-col gap-6"><FieldGroup>{signup&&<Field><FieldLabel>Nombre completo</FieldLabel><Input value={name} onChange={e=>setName(e.target.value)} required/></Field>}<Field><FieldLabel>Correo electrónico</FieldLabel><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></Field><Field><FieldLabel>Contraseña</FieldLabel><InputGroup><InputGroupInput type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required/><InputGroupAddon align="inline-end"><InputGroupButton type="button" size="icon-xs" onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</InputGroupButton></InputGroupAddon></InputGroup></Field></FieldGroup><Button type="submit" size="lg" disabled={loading}>{loading?<><LoaderCircle data-icon="inline-start" className="animate-spin"/>{signup?"Creando...":"Ingresando..."}</>:signup?"Crear primera cuenta":"Iniciar sesión"}</Button><Button type="button" variant="ghost" onClick={()=>setSignup(!signup)}>{signup?"Ya tengo cuenta":"Crear cuenta"}</Button>{signup&&<p className="text-center text-xs text-muted-foreground">La primera cuenta registrada en este SIGIA se convierte automáticamente en Administrador.</p>}</form>}
