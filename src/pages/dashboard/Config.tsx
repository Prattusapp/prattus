import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Building2, 
  MapPin, 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  X,
  Image as ImageIcon,
  Users,
  ShieldCheck,
  Layers,
  DollarSign,
  Phone,
  Hospital
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Helper for masks
const maskCNPJ = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .substring(0, 18)
}

const maskCEP = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{5})(\d)/, "$1-$2")
    .substring(0, 9)
}

const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .substring(0, 15)
}

const maskCurrency = (value: number | string) => {
  if (value === undefined || value === null) return "R$ 0,00"
  const val = typeof value === 'string' ? value.replace(/\D/g, "") : Math.round(value * 100).toString()
  const cents = parseInt(val || "0")
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

const parseCurrency = (value: string): number => {
  const cleanValue = value.replace(/\D/g, "")
  return parseInt(cleanValue || "0") / 100
}

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState("empresa")
  const [loading, setLoading] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [institutionId, setInstitutionId] = useState<string | null>(null)

  // --- States ---
  const [company, setCompany] = useState({
    razao_social: "",
    cnpj: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    whatsapp: "",
    email: "",
    logo_url: "",
    price_desjejum: 0,
    price_lanche_manha: 0,
    price_almoco: 0,
    price_lanche_tarde: 0,
    price_jantar: 0,
    price_lanche_noite: 0,
    price_extras: 0,
    price_lactario: 0
  })

  const [sectors, setSectors] = useState<any[]>([])
  const [sectorDialogOpen, setSectorDialogOpen] = useState(false)
  const [editingSector, setEditingSector] = useState<any>(null)
  const [sectorData, setSectorData] = useState({ name: "", unidade_id: "" })

  const [publicTypes, setPublicTypes] = useState<any[]>([])
  const [publicDialogOpen, setPublicDialogOpen] = useState(false)
  const [editingPublic, setEditingPublic] = useState<any>(null)
  const [publicData, setPublicData] = useState({ name: "", unidade_id: "", active: true })

  const [unidades, setUnidades] = useState<any[]>([])
  const [unitDialogOpen, setUnitDialogOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<any>(null)
  const [unitData, setUnitData] = useState({
    name: "",
    cnpj: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    responsible: "",
    whatsapp: "",
    email: ""
  })
  const isGerente = currentUserProfile?.role === 'gerente'

  const [users, setUsers] = useState<any[]>([])
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [userError, setUserError] = useState<string | null>(null)
  const [userData, setUserData] = useState({
    full_name: '',
    email: '',
    whatsapp: '',
    role: 'nutricionista',
    crn: '',
    password: '',
    unidade_id: ''
  })

  // --- Effects ---
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      // 1. Carregar perfil do usuário logado
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
      setCurrentUserProfile(profile)
      if (profile?.institution_id) setInstitutionId(profile.institution_id)

      // 2. Configurações da Empresa
      const { data: cData } = await supabase.from('hospital_config').select('*').single()
      if (cData) setCompany(cData)

      // 3. Unidades (Com filtro se não for gerente)
      let uQuery = supabase.from('hospital_unidades').select('*').order('name')
      if (profile?.role !== 'gerente' && profile?.unidade_id) {
        uQuery = uQuery.eq('id', profile.unidade_id)
        if (activeTab === 'empresa') setActiveTab('unidades')
      }
      const { data: uData } = await uQuery
      setUnidades(uData || [])

      // 4. Setores (Com filtro se não for gerente)
      let sQuery = supabase.from('hospital_setores').select('*').order('name')
      if (profile?.role !== 'gerente' && profile?.unidade_id) {
        sQuery = sQuery.eq('unidade_id', profile.unidade_id)
      }
      const { data: sData } = await sQuery
      setSectors(sData || [])

      // 5. Tipos de Público (Com filtro se não for gerente)
      let pQuery = supabase.from('contagem_tipos').select('*').order('name')
      if (profile?.role !== 'gerente' && profile?.unidade_id) {
        pQuery = pQuery.eq('unidade_id', profile.unidade_id)
      }
      const { data: pData } = await pQuery
      setPublicTypes(pData || [])

      if (profile?.role === 'gerente') fetchUsers()
    } catch (err) {
      import.meta.env.DEV && console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setUsers(data || [])
  }

  // --- Helpers ---
  const fetchCEP = async (cep: string, setter: any) => {
    const cleanCEP = cep.replace(/\D/g, "")
    if (cleanCEP.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setter((prev: any) => ({
            ...prev,
            logradouro: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf
          }))
        }
      } catch (err) {
        import.meta.env.DEV && console.error("Erro ao buscar CEP")
      }
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validações de Backend Replicadas no Client para UX Instantânea
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setMsg({ type: 'error', text: 'Formato inaceitável. Envie apenas as extensões reais JPG, PNG ou WEBP.' })
      return
    }

    if (file.size > 2 * 1024 * 1024) { // 2 Megabytes Físicos
      setMsg({ type: 'error', text: 'Desculpe, o tamanho da logo viola as regras. O máximo permitido são 2MB.' })
      return
    }

    setLoading(true)
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      const fileName = `logo_${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName)
      const { error } = await supabase.from('hospital_config').update({ logo_url: publicUrl }).eq('id', (company as any).id || 1)
      if (error) throw error
      setCompany(prev => ({ ...prev, logo_url: publicUrl }))
      setMsg({ type: 'success', text: "Logo atualizada com segurança e êxito!" })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Erro ao comunicar com o Bucket.' })
    } finally {
      setLoading(false)
    }
  }

  // --- CRUD Functions ---
  const saveCompany = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      let currentId = institutionId

      // Se o usuário não tem empresa ainda, fazer o Boot-Up completo
      if (!currentId) {
        currentId = crypto.randomUUID()
        
        // 1. Criar a linha mestra na tabela institutions (Essencial para FK)
        const { error: instError } = await supabase
          .from('institutions')
          .insert({ 
            id: currentId, 
            name: company.razao_social || 'Nova Instituição' 
          })
        
        if (instError) throw instError

        // 2. Vincular o perfil do usuário à nova empresa
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ institution_id: currentId })
          .eq('id', user.id)
        
        if (profileError) throw profileError
        setInstitutionId(currentId)
      }

      // 3. Salvar as configurações visuais da empresa em hospital_config
      const { error: configError } = await supabase.from('hospital_config').upsert({ 
        ...company, 
        institution_id: currentId,
        updated_at: new Date() 
      })

      if (configError) throw configError
      
      setMsg({ type: 'success', text: "Empresa configurada com sucesso!" })
      fetchData() // Sincronizar todos os estados
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const saveUnit = async () => {
    if (!institutionId) {
      setMsg({ type: 'error', text: "Por favor, salve os dados da Empresa primeiro!" })
      setUnitDialogOpen(false)
      setActiveTab("empresa")
      return
    }

    setLoading(true)
    try {
      // Limpar campos que não existem no banco de dados (como o CEP)
      const { cep, ...cleanData } = unitData as any;

      const { error } = editingUnit 
        ? await supabase.from('hospital_unidades').update({ ...cleanData }).eq('id', editingUnit.id)
        : await supabase.from('hospital_unidades').insert({ ...cleanData, institution_id: institutionId })
      
      if (error) throw error
      setUnitDialogOpen(false)
      fetchData()
      setMsg({ type: 'success', text: "Unidade salva!" })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const saveSector = async () => {
    if (!institutionId) {
      setMsg({ type: 'error', text: "Salve os dados da Empresa primeiro!" })
      return
    }

    setLoading(true)
    try {
      const { error } = editingSector
        ? await supabase.from('hospital_setores').update({ ...sectorData }).eq('id', editingSector.id)
        : await supabase.from('hospital_setores').insert({ ...sectorData, institution_id: institutionId })
      
      if (error) throw error
      setSectorDialogOpen(false)
      fetchData()
      setMsg({ type: 'success', text: "Setor salvo!" })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const savePublic = async () => {
    if (!institutionId) {
      setMsg({ type: 'error', text: "Salve os dados da Empresa primeiro!" })
      return
    }

    setLoading(true)
    try {
      const { error } = editingPublic
        ? await supabase.from('contagem_tipos').update({ ...publicData }).eq('id', editingPublic.id)
        : await supabase.from('contagem_tipos').insert({ ...publicData, institution_id: institutionId })
      
      if (error) throw error
      setPublicDialogOpen(false)
      fetchData()
      setMsg({ type: 'success', text: "Público salvo!" })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const saveUser = async () => {
    setUserError(null)
    if (!userData.email || !userData.full_name || (!editingUser && !userData.password)) {
      setUserError("Preencha todos os campos obrigatórios.")
      return
    }
    
    // Validação de formato de e-mail simples
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userData.email)) {
      setUserError("E-mail em formato inválido. Verifique se há erros de digitação.")
      return
    }

    setLoading(true)
    try {
      if (editingUser) {
        const { error } = await supabase.from('profiles').update({
          full_name: userData.full_name,
          whatsapp: userData.whatsapp,
          role: userData.role,
          crn: userData.role === 'nutricionista' ? userData.crn : null,
          email: userData.email
        }).eq('id', editingUser.id)
        if (error) throw error
      } else {
        const { data: { session } } = await supabase.auth.getSession()
        const { error } = await supabase.functions.invoke('create-user', { 
          body: userData,
          headers: {
            Authorization: `Bearer ${session?.access_token}`
          }
        })
        if (error) throw error
      }
      setUserDialogOpen(false)
      fetchUsers()
      setMsg({ type: 'success', text: "Operação realizada!" })
    } catch (err: any) {
      setUserError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6 animate-in fade-in duration-500 pb-10 px-4 md:px-0">
      <header>
         <h1 className="text-2xl md:text-3xl font-black tracking-tight">Configurações</h1>
         <p className="text-sm md:text-base text-muted-foreground">Gerencie a instituição, membros e permissões.</p>
      </header>

      {msg && (
        <div className={cn("flex items-center gap-3 rounded-2xl border p-4 text-sm font-medium", msg.type === 'success' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
          {msg.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {msg.text}
          <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={() => setMsg(null)}><X className="h-4 w-4" /></Button>
        </div>
      )}

       <Tabs defaultValue="empresa" className="w-full max-w-full overflow-hidden">
         <TabsList className="w-full bg-muted/20 p-1.5 rounded-2xl h-auto grid grid-cols-3 md:flex md:flex-wrap lg:flex-nowrap gap-1.5 border border-border/50 mb-6 md:mb-8 whitespace-normal shadow-inner">
          {isGerente && (
            <TabsTrigger value="empresa" className="rounded-xl flex items-center justify-center gap-2 py-2.5 px-2 font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"><Building className="h-3.5 w-3.5" /> <span className="text-[10px] sm:text-xs">Empresa</span></TabsTrigger>
          )}
          <TabsTrigger value="unidades" className="rounded-xl flex items-center justify-center gap-2 py-2.5 px-2 font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Hospital className="h-3.5 w-3.5" /> <span className="text-[10px] sm:text-xs">{isGerente ? "Unidades" : "Minha Unidade"}</span>
          </TabsTrigger>
          <TabsTrigger value="setores" className="rounded-xl flex items-center justify-center gap-2 py-2.5 px-2 font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"><Layers className="h-3.5 w-3.5" /> <span className="text-[10px] sm:text-xs">Setores</span></TabsTrigger>
          <TabsTrigger value="publico" className="rounded-xl flex items-center justify-center gap-2 py-2.5 px-2 font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"><Users className="h-3.5 w-3.5" /> <span className="text-[10px] sm:text-xs">Públicos</span></TabsTrigger>
          
          {isGerente && (
            <>
              <TabsTrigger value="precos" className="rounded-xl flex items-center justify-center gap-2 py-2.5 px-2 font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"><DollarSign className="h-3.5 w-3.5" /> <span className="text-[10px] sm:text-xs">Preços</span></TabsTrigger>
              <TabsTrigger value="usuarios" className="rounded-xl flex items-center justify-center gap-2 py-2.5 px-2 font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"><ShieldCheck className="h-3.5 w-3.5" /> <span className="text-[10px] sm:text-xs">Usuários</span></TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Tab: Empresa */}
        <TabsContent value="empresa">
          <Card className="rounded-3xl border-border/50 shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50 p-4 md:pb-8 md:pt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                 <CardTitle className="text-xl md:text-2xl font-black flex items-center gap-3"><Building2 className="h-6 w-6 text-blue-600" /> Dados da Instituição</CardTitle>
                 <CardDescription className="text-xs md:text-sm">Informações básicas que aparecem em relatórios e cabeçalhos.</CardDescription>
               </div>
            </CardHeader>
            <CardContent className="p-4 md:p-8 space-y-6 md:space-y-8">
              <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10 border-b border-dashed pb-8">
                <div className="relative group cursor-pointer h-28 w-28 md:h-32 md:w-32 rounded-3xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 mx-auto lg:mx-0 shrink-0 shadow-inner">
                  {company.logo_url ? (
                    <img src={company.logo_url} className="h-full w-full object-contain" />
                  ) : <ImageIcon className="h-8 w-8 text-slate-400" />}
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer uppercase tracking-widest">
                    <Upload className="h-5 w-5 mb-1" /> Alterar Logo
                    <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                  </label>
                </div>
                <div className="flex-1 space-y-4 w-full">
                  <div className="grid gap-4 grid-cols-1">
                    <div className="space-y-2">
                       <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Razão Social</Label>
                       <Input value={company.razao_social} onChange={(e) => setCompany({...company, razao_social: e.target.value})} className="rounded-xl h-11 md:h-12" />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">CNPJ</Label>
                       <Input value={company.cnpj} onChange={(e) => setCompany({...company, cnpj: maskCNPJ(e.target.value)})} className="rounded-xl h-11 md:h-12" placeholder="00.000.000/0000-00" />
                    </div>
                  </div>
                  <div className="grid gap-4 grid-cols-1">
                    <div className="space-y-2">
                       <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">WhatsApp</Label>
                       <Input value={company.whatsapp} onChange={(e) => setCompany({...company, whatsapp: maskPhone(e.target.value)})} className="rounded-xl h-11 md:h-12" placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">E-mail</Label>
                       <Input value={company.email} onChange={(e) => setCompany({...company, email: e.target.value})} className="rounded-xl h-11 md:h-12" placeholder="contato@hospital.com.br" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <h3 className="font-black text-xl flex items-center gap-2"><MapPin className="h-5 w-5 text-blue-600" /> Endereço da Sede</h3>
                <div className="grid gap-4 grid-cols-1">
                   <div className="space-y-2">
                      <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">CEP</Label>
                      <Input value={company.cep} onChange={(e) => setCompany({...company, cep: maskCEP(e.target.value)})} onBlur={() => fetchCEP(company.cep, setCompany)} className="rounded-xl h-11 md:h-12 text-sm" placeholder="00000-000" />
                   </div>
                </div>
                  <div className="grid gap-4 grid-cols-1">
                    <div className="space-y-2">
                       <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Logradouro</Label>
                       <Input value={company.logradouro} onChange={(e) => setCompany({...company, logradouro: e.target.value})} className="rounded-xl h-11 md:h-12" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                       <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Número</Label>
                       <Input value={company.numero} onChange={(e) => setCompany({...company, numero: e.target.value})} className="rounded-xl h-11 md:h-12" />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Bairro</Label>
                       <Input value={company.bairro} onChange={(e) => setCompany({...company, bairro: e.target.value})} className="rounded-xl h-11 md:h-12" />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Cidade/UF</Label>
                       <div className="flex gap-2">
                         <Input value={company.cidade} onChange={(e) => setCompany({...company, cidade: e.target.value})} className="rounded-xl h-11 md:h-12 flex-1" />
                         <Input value={company.uf} onChange={(e) => setCompany({...company, uf: e.target.value.toUpperCase()})} className="rounded-xl h-11 md:h-12 w-16 px-1 text-center" maxLength={2} />
                       </div>
                    </div>
                  </div>
              </div>

              <div className="flex justify-end pt-8">
                 <Button onClick={saveCompany} disabled={loading} className="w-full md:w-auto rounded-2xl h-14 px-10 bg-blue-600 hover:bg-blue-500 font-bold shadow-lg shadow-blue-500/20">
                   {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                   Salvar Alterações
                 </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Setores */}
        <TabsContent value="setores">
           <Card className="rounded-3xl border-border/50 shadow-xl overflow-hidden">
             <CardHeader className="bg-muted/30 border-b border-border/50 p-4 md:pb-8 md:pt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                 <CardTitle className="text-xl md:text-2xl font-black flex items-center gap-3"><Layers className="h-6 w-6 text-blue-600" /> Gestão de Setores</CardTitle>
                 <CardDescription className="text-xs md:text-sm">Vincule os setores às unidades cadastradas.</CardDescription>
               </div>
               <Button onClick={() => { setEditingSector(null); setSectorData({ name: "", unidade_id: isGerente ? "" : currentUserProfile?.unidade_id }); setSectorDialogOpen(true); }} className="w-full md:w-auto rounded-xl bg-blue-600 hover:bg-blue-500 font-bold h-11 px-6 shadow-lg shadow-blue-500/20">
                 <Plus className="h-4 w-4 mr-2" /> Novo Setor
               </Button>
             </CardHeader>
             <CardContent className="p-0">
                {/* Mobile: Lista de Cards */}
                <div className="md:hidden space-y-3 p-4 bg-muted/10">
                  {sectors.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-xs font-bold uppercase tracking-widest">Nenhum setor cadastrado.</div>
                  ) : sectors.map((s) => (
                    <div key={s.id} className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <h4 className="font-black text-sm text-slate-800 leading-tight uppercase">{s.name}</h4>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Building className="h-3 w-3" />
                            <span className="text-[10px] font-bold uppercase">{unidades.find(u => u.id === s.unidade_id)?.name || '---'}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                           <Button variant="ghost" size="icon" className="h-9 w-9 bg-muted/30 rounded-xl" onClick={() => { setEditingSector(s); setSectorData({ name: s.name, unidade_id: s.unidade_id }); setSectorDialogOpen(true); }}><Pencil className="h-4 w-4 text-blue-600" /></Button>
                           <Button variant="ghost" size="icon" className="h-9 w-9 bg-rose-50 rounded-xl" onClick={async () => { if(confirm("Apagar?")) { await supabase.from('hospital_setores').delete().eq('id', s.id); fetchData(); } }}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: Tabela */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-8 py-4 font-black text-xs uppercase tracking-widest">Nome do Setor</TableHead>
                        <TableHead className="font-black text-xs uppercase tracking-widest">Unidade</TableHead>
                        <TableHead className="w-[100px] text-right pr-8 font-black text-xs uppercase tracking-widest">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sectors.map((s) => (
                        <TableRow key={s.id} className="hover:bg-muted/20">
                          <TableCell className="font-bold pl-8 py-4">{s.name}</TableCell>
                          <TableCell className="text-muted-foreground">{unidades.find(u => u.id === s.unidade_id)?.name || '---'}</TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="flex items-center justify-end gap-2">
                               <Button variant="ghost" size="icon" onClick={() => { setEditingSector(s); setSectorData({ name: s.name, unidade_id: s.unidade_id }); setSectorDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                               <Button variant="ghost" size="icon" className="text-rose-600" onClick={async () => { if(confirm("Apagar?")) { await supabase.from('hospital_setores').delete().eq('id', s.id); fetchData(); } }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
             </CardContent>
           </Card>
        </TabsContent>

        {/* Tab: Unidades */}
        <TabsContent value="unidades">
          <Card className="rounded-3xl border-border/50 shadow-xl overflow-hidden">
             <CardHeader className="bg-muted/30 border-b border-border/50 p-4 md:pb-8 md:pt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                 <CardTitle className="text-xl md:text-2xl font-black flex items-center gap-3"><Building2 className="h-6 w-6 text-blue-600" /> {isGerente ? "Gestão de Unidades" : "Dados da Unidade"}</CardTitle>
                 <CardDescription className="text-xs md:text-sm">Cadastre e gerencie as unidades do hospital.</CardDescription>
               </div>
               {isGerente && (
                 <Button onClick={() => { setEditingUnit(null); setUnitData({ name: "", cnpj: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", cep: "", whatsapp: "", email: "", responsible: "" }); setUnitDialogOpen(true); }} className="w-full md:w-auto rounded-xl bg-blue-600 hover:bg-blue-500 font-bold h-11 px-6 shadow-lg shadow-blue-500/20">
                   <Plus className="h-4 w-4 mr-2" /> Nova Unidade
                 </Button>
               )}
             </CardHeader>
             <CardContent className="p-0">
               {/* Mobile: Lista de Cards */}
               <div className="md:hidden space-y-3 p-4 bg-muted/10">
                 {unidades.length === 0 ? (
                   <div className="text-center py-10 text-muted-foreground text-xs font-bold uppercase tracking-widest">Nenhuma unidade cadastrada.</div>
                 ) : unidades.map((u) => (
                   <div key={u.id} className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm space-y-4">
                     <div className="flex justify-between items-start gap-4">
                       <div className="space-y-1">
                         <h4 className="font-black text-sm text-slate-800 leading-tight uppercase">{u.name}</h4>
                         <div className="flex items-center gap-1 text-muted-foreground">
                           <MapPin className="h-3 w-3" />
                           <span className="text-[10px] font-bold uppercase">{u.cidade || 'Sim Cidade'}/{u.uf || 'UF'}</span>
                         </div>
                       </div>
                       <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-9 w-9 bg-muted/30 rounded-xl" onClick={() => { setEditingUnit(u); setUnitData(u); setUnitDialogOpen(true); }}><Pencil className="h-4 w-4 text-blue-600" /></Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 bg-rose-50 rounded-xl" onClick={async () => { if(confirm("Deseja realmente apagar esta unidade?")) { await supabase.from('hospital_unidades').delete().eq('id', u.id); fetchData(); } }}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                       </div>
                     </div>

                     <div className="flex items-center gap-3 pt-3 border-t border-dashed border-border">
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Responsável</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">{u.responsible || 'Não informado'}</span>
                            {u.whatsapp && (
                              <a 
                                href={`https://wa.me/55${u.whatsapp.replace(/\D/g, "")}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[#25D366] hover:text-emerald-600 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                     </div>
                   </div>
                 ))}
               </div>

               {/* Desktop: Tabela Tradicional */}
               <div className="hidden md:block">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead className="pl-8 py-4 font-black text-xs uppercase tracking-widest">Nome</TableHead>
                       <TableHead className="font-black text-xs uppercase tracking-widest">Cidade/UF</TableHead>
                       <TableHead className="font-black text-xs uppercase tracking-widest">Responsável</TableHead>
                       <TableHead className="w-[100px] text-right pr-8 font-black text-xs uppercase tracking-widest">Ações</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {unidades.map((u) => (
                       <TableRow key={u.id} className="hover:bg-muted/20">
                         <TableCell className="font-bold pl-8 py-4">{u.name}</TableCell>
                         <TableCell className="text-muted-foreground">{u.cidade}/{u.uf}</TableCell>
                          <TableCell className="text-slate-700">
                            <div className="flex items-center gap-3">
                              <span className="font-bold">{u.responsible || '---'}</span>
                              {u.whatsapp && (
                                <a 
                                  href={`https://wa.me/55${u.whatsapp.replace(/\D/g, "")}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-all font-mono text-[10px] font-black"
                                >
                                  <Phone className="h-3 w-3" />
                                  {u.whatsapp}
                                </a>
                              )}
                            </div>
                          </TableCell>
                         <TableCell className="text-right pr-8">
                           <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingUnit(u); setUnitData(u); setUnitDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-rose-600" onClick={async () => { if(confirm("Apagar?")) { await supabase.from('hospital_unidades').delete().eq('id', u.id); fetchData(); } }}><Trash2 className="h-4 w-4" /></Button>
                           </div>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
             </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Gestão de Público */}
        <TabsContent value="publico">
          <Card className="rounded-3xl border-border/50 shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50 p-4 md:pb-8 md:pt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                 <CardTitle className="text-xl md:text-2xl font-black flex items-center gap-3"><Users className="h-6 w-6 text-blue-600" /> Tipos de Público</CardTitle>
                 <CardDescription className="text-xs md:text-sm">Configure categorias (Acompanhante, Colaborador, etc.)</CardDescription>
               </div>
               <Button onClick={() => { setEditingPublic(null); setPublicData({ name: "", unidade_id: isGerente ? "" : currentUserProfile?.unidade_id, active: true }); setPublicDialogOpen(true); }} className="w-full md:w-auto rounded-xl bg-blue-600 hover:bg-blue-500 font-bold h-11 px-6 shadow-lg shadow-blue-500/20">
                 <Plus className="h-4 w-4 mr-2" /> Novo Público
               </Button>
            </CardHeader>
             <CardContent className="p-0">
                {/* Mobile: Lista de Cards */}
                <div className="md:hidden space-y-3 p-4 bg-muted/10">
                  {publicTypes.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-xs font-bold uppercase tracking-widest">Nenhum público cadastrado.</div>
                  ) : publicTypes.map((p) => (
                    <div key={p.id} className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <h4 className="font-black text-sm text-slate-800 leading-tight uppercase">{p.name}</h4>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Building className="h-3 w-3" />
                            <span className="text-[10px] font-bold uppercase">{unidades.find(u => u.id === p.unidade_id)?.name || '---'}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                           <Button variant="ghost" size="icon" className="h-9 w-9 bg-muted/30 rounded-xl" onClick={() => { setEditingPublic(p); setPublicData(p); setPublicDialogOpen(true); }}><Pencil className="h-4 w-4 text-blue-600" /></Button>
                           <Button variant="ghost" size="icon" className="h-9 w-9 bg-rose-50 rounded-xl" onClick={async () => { if(confirm("Apagar?")) { await supabase.from('contagem_tipos').delete().eq('id', p.id); fetchData(); } }}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-dashed border-border flex justify-between items-center">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Status</span>
                        <span className={cn("px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", p.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                          {p.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: Tabela */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-8 py-4 font-black text-xs uppercase tracking-widest font-black uppercase tracking-widest text-[10px]">Nome do Tipo</TableHead>
                        <TableHead className="font-black text-xs uppercase tracking-widest font-black uppercase tracking-widest text-[10px]">Unidade</TableHead>
                        <TableHead className="font-black text-xs uppercase tracking-widest font-black uppercase tracking-widest text-[10px]">Status</TableHead>
                        <TableHead className="w-[100px] text-right pr-8 font-black text-xs uppercase tracking-widest font-black uppercase tracking-widest text-[10px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {publicTypes.map((p) => (
                        <TableRow key={p.id} className="hover:bg-muted/20">
                          <TableCell className="font-bold pl-8 py-4">{p.name}</TableCell>
                          <TableCell className="text-muted-foreground">{unidades.find(u => u.id === p.unidade_id)?.name || '---'}</TableCell>
                          <TableCell><span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase", p.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700")}>{p.active ? "Ativo" : "Inativo"}</span></TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="flex items-center justify-end gap-2">
                               <Button variant="ghost" size="icon" onClick={() => { setEditingPublic(p); setPublicData(p); setPublicDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                               <Button variant="ghost" size="icon" className="text-rose-600" onClick={async () => { if(confirm("Apagar?")) { await supabase.from('contagem_tipos').delete().eq('id', p.id); fetchData(); } }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
             </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Gestão de Preços */}
        <TabsContent value="precos">
          <Card className="rounded-3xl border-border/50 shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50 p-4 md:pb-8 md:pt-8">
               <CardTitle className="text-xl md:text-2xl font-black flex items-center gap-3"><DollarSign className="h-6 w-6 text-blue-600" /> Tabela de Preços</CardTitle>
               <CardDescription className="text-xs md:text-sm">Defina os valores unitários para faturamento e custos.</CardDescription>
             </CardHeader>
             <CardContent className="p-4 md:p-8 space-y-8">
               <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
                <div className="space-y-6">
                  <h3 className="font-bold text-lg text-blue-700 flex items-center gap-2">Refeições Principais</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr,120px] items-center gap-2 sm:gap-4">
                      <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground sm:text-foreground">Desjejum</Label>
                      <Input 
                        value={maskCurrency(company.price_desjejum)} 
                        onChange={(e) => setCompany({...company, price_desjejum: parseCurrency(e.target.value)})}
                        className="rounded-xl h-11 text-right font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr,120px] items-center gap-2 sm:gap-4">
                      <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground sm:text-foreground">Lanche Manhã</Label>
                      <Input 
                        value={maskCurrency(company.price_lanche_manha)} 
                        onChange={(e) => setCompany({...company, price_lanche_manha: parseCurrency(e.target.value)})}
                        className="rounded-xl h-11 text-right font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr,120px] items-center gap-2 sm:gap-4">
                      <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground sm:text-foreground">Almoço</Label>
                      <Input 
                        value={maskCurrency(company.price_almoco)} 
                        onChange={(e) => setCompany({...company, price_almoco: parseCurrency(e.target.value)})}
                        className="rounded-xl h-11 text-right font-mono text-blue-600 font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr,120px] items-center gap-2 sm:gap-4">
                      <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground sm:text-foreground">Lanche Tarde</Label>
                      <Input 
                        value={maskCurrency(company.price_lanche_tarde)} 
                        onChange={(e) => setCompany({...company, price_lanche_tarde: parseCurrency(e.target.value)})}
                        className="rounded-xl h-11 text-right font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="font-bold text-lg text-blue-700 flex items-center gap-2">Noite e Serviços Especiais</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr,120px] items-center gap-2 sm:gap-4">
                      <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground sm:text-foreground">Jantar</Label>
                      <Input 
                        value={maskCurrency(company.price_jantar)} 
                        onChange={(e) => setCompany({...company, price_jantar: parseCurrency(e.target.value)})}
                        className="rounded-xl h-11 text-right font-mono text-blue-600 font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr,120px] items-center gap-2 sm:gap-4">
                      <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground sm:text-foreground">Lanche Noite</Label>
                      <Input 
                        value={maskCurrency(company.price_lanche_noite)} 
                        onChange={(e) => setCompany({...company, price_lanche_noite: parseCurrency(e.target.value)})}
                        className="rounded-xl h-11 text-right font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr,120px] items-center gap-2 sm:gap-4">
                      <Label className="font-bold text-xs uppercase tracking-widest text-emerald-600 sm:text-emerald-700">Extras (Dieta)</Label>
                      <Input 
                        value={maskCurrency(company.price_extras)} 
                        onChange={(e) => setCompany({...company, price_extras: parseCurrency(e.target.value)})}
                        className="rounded-xl h-11 text-right font-mono border-emerald-200"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr,120px] items-center gap-2 sm:gap-4">
                      <Label className="font-bold text-xs uppercase tracking-widest text-amber-600 sm:text-amber-700">Lactário</Label>
                      <Input 
                        value={maskCurrency(company.price_lactario)} 
                        onChange={(e) => setCompany({...company, price_lactario: parseCurrency(e.target.value)})}
                        className="rounded-xl h-11 text-right font-mono border-amber-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-8 border-t border-dashed">
                <Button onClick={saveCompany} disabled={loading} className="rounded-2xl h-14 px-10 bg-blue-600 hover:bg-blue-500 font-bold shadow-lg shadow-blue-500/20">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                  Salvar Tabela de Preços
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="usuarios">
          <Card className="rounded-3xl border-border/50 shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50 p-4 md:pb-8 md:pt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl md:text-2xl font-black flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-blue-600" /> Gestão de Usuários</CardTitle>
                <CardDescription className="text-xs md:text-sm">Membros da rede e seus cargos.</CardDescription>
              </div>
              <Button onClick={() => { setEditingUser(null); setUserData({ full_name: '', email: '', whatsapp: '', role: 'nutricionista', crn: '', password: '', unidade_id: '' }); setUserDialogOpen(true); }} className="w-full md:w-auto rounded-xl bg-blue-600 hover:bg-blue-500 font-bold h-11 px-6 shadow-lg shadow-blue-500/20">
                <Plus className="h-4 w-4 mr-2" /> Cadastrar Usuário
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
               {/* Mobile: Lista de Cards */}
               <div className="md:hidden space-y-3 p-4 bg-muted/10">
                 {users.length === 0 ? (
                   <div className="text-center py-10 text-muted-foreground text-xs font-bold uppercase tracking-widest">Nenhum usuário cadastrado.</div>
                 ) : users.map((u) => (
                   <div key={u.id} className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm space-y-4">
                     <div className="flex justify-between items-start gap-4">
                       <div className="space-y-1">
                         <h4 className="font-black text-sm text-slate-800 leading-tight uppercase">{u.full_name}</h4>
                         <span className="text-[10px] font-bold text-muted-foreground truncate block max-w-[200px]">{u.email}</span>
                       </div>
                       <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-9 w-9 bg-muted/30 rounded-xl" onClick={() => { setEditingUser(u); setUserData({...u, password: ''}); setUserDialogOpen(true); }}><Pencil className="h-4 w-4 text-blue-600" /></Button>
                       </div>
                     </div>

                     <div className="grid grid-cols-2 gap-3 pt-3 border-t border-dashed border-border">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Cargo</span>
                          <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider w-fit", u.role === 'gerente' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
                            {u.role}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-right">Status</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={cn("inline-flex h-2 w-2 rounded-full", u.require_password_change ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
                            <span className="text-[10px] font-bold text-slate-600 uppercase">{u.require_password_change ? "Trocar Senha" : "Ativo"}</span>
                          </div>
                        </div>
                     </div>
                     {u.whatsapp && (
                       <div className="flex items-center gap-2 pt-2 text-[#25D366]">
                         <Phone className="h-3 w-3" />
                         <span className="text-[10px] font-bold font-mono">{u.whatsapp}</span>
                       </div>
                     )}
                   </div>
                 ))}
               </div>

               {/* Desktop: Tabela */}
               <div className="hidden md:block">
                 <Table>
                   <TableHeader className="bg-muted/50">
                     <TableRow>
                       <TableHead className="pl-8 py-4 font-black text-xs uppercase tracking-widest text-[10px]">Nome</TableHead>
                       <TableHead className="font-black text-xs uppercase tracking-widest text-[10px]">E-mail</TableHead>
                       <TableHead className="font-black text-xs uppercase tracking-widest text-[10px]">WhatsApp</TableHead>
                       <TableHead className="font-black text-xs uppercase tracking-widest text-[10px]">Cargo</TableHead>
                       <TableHead className="w-[150px] text-right pr-8 font-black text-xs uppercase tracking-widest text-[10px]">Status</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {users.map((u) => (
                       <TableRow key={u.id} className="hover:bg-muted/10">
                         <TableCell className="font-bold pl-8 py-4">{u.full_name}</TableCell>
                         <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                         <TableCell className="text-muted-foreground text-sm font-mono">{u.whatsapp || '---'}</TableCell>
                         <TableCell>
                           <span className={cn("px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider", u.role === 'gerente' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>{u.role}</span>
                         </TableCell>
                         <TableCell className="text-right pr-8">
                            <div className="flex items-center justify-end gap-2">
                              <span className={cn("inline-flex h-2 w-2 rounded-full", u.require_password_change ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
                              <Button variant="ghost" size="icon" onClick={() => { setEditingUser(u); setUserData({...u, password: ''}); setUserDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                            </div>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
             </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODALS */}
      
      {/* Setor Modal */}
      <Dialog open={sectorDialogOpen} onOpenChange={setSectorDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Setor</DialogTitle>
            <CardDescription>Defina os detalhes do setor hospitalar.</CardDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Nome do Setor</Label>
              <Input value={sectorData.name} onChange={(e) => setSectorData({...sectorData, name: e.target.value})} className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Unidade</Label>
              <select 
                disabled={!isGerente}
                value={sectorData.unidade_id} 
                onChange={(e) => setSectorData({...sectorData, unidade_id: e.target.value})} 
                className="w-full h-11 rounded-xl border px-3 bg-muted/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <option value="">Selecione...</option>
                {unidades.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter><Button onClick={saveSector} disabled={loading} className="rounded-xl bg-blue-600 font-bold">Salvar Setor</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unidade Modal */}
      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent className="rounded-[2rem] max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Unidade</DialogTitle>
            <CardDescription>Dados cadastrais da unidade hospitalar.</CardDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="grid grid-cols-1 gap-4">
               <div className="space-y-2"><Label>Nome</Label><Input value={unitData.name} onChange={(e)=>setUnitData({...unitData, name: e.target.value})} /></div>
               <div className="space-y-2"><Label>CNPJ</Label><Input value={unitData.cnpj} onChange={(e)=>setUnitData({...unitData, cnpj: maskCNPJ(e.target.value)})} /></div>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-2"><Label>CEP</Label><Input value={unitData.cep} onChange={(e)=>setUnitData({...unitData, cep: maskCEP(e.target.value)})} onBlur={()=>fetchCEP(unitData.cep, setUnitData)} /></div>
               <div className="space-y-2"><Label>Nº</Label><Input value={unitData.numero} onChange={(e)=>setUnitData({...unitData, numero: e.target.value})} /></div>
             </div>
             <div className="space-y-2"><Label>Logradouro</Label><Input value={unitData.logradouro} onChange={(e)=>setUnitData({...unitData, logradouro: e.target.value})} /></div>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <div className="space-y-2"><Label>Bairro</Label><Input value={unitData.bairro} onChange={(e)=>setUnitData({...unitData, bairro: e.target.value})} /></div>
               <div className="space-y-2"><Label>Cidade</Label><Input value={unitData.cidade} onChange={(e)=>setUnitData({...unitData, cidade: e.target.value})} /></div>
               <div className="space-y-2"><Label>UF</Label><Input value={unitData.uf} onChange={(e)=>setUnitData({...unitData, uf: e.target.value.toUpperCase()})} maxLength={2} /></div>
             </div>
             <div className="grid grid-cols-1 gap-4 border-t pt-4">
               <div className="space-y-2"><Label>Responsável</Label><Input value={unitData.responsible} onChange={(e)=>setUnitData({...unitData, responsible: e.target.value})} /></div>
               <div className="space-y-2"><Label>WhatsApp</Label><Input value={unitData.whatsapp} onChange={(e)=>setUnitData({...unitData, whatsapp: maskPhone(e.target.value)})} /></div>
               <div className="space-y-2"><Label>E-mail</Label><Input value={unitData.email} onChange={(e)=>setUnitData({...unitData, email: e.target.value})} /></div>
             </div>
          </div>
          <DialogFooter><Button onClick={saveUnit} disabled={loading} className="rounded-xl bg-blue-600 font-bold">Salvar Unidade</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Público Modal */}
      <Dialog open={publicDialogOpen} onOpenChange={setPublicDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md">
           <DialogHeader>
             <DialogTitle className="text-2xl font-black">Tipo de Público</DialogTitle>
             <CardDescription>Configure como esse público será identificado.</CardDescription>
           </DialogHeader>
           <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Label>Nome do Público</Label>
                <Input value={publicData.name} onChange={(e) => setPublicData({...publicData, name: e.target.value})} className="rounded-xl h-11" />
             </div>
             <div className="space-y-2">
                <Label>Unidade</Label>
                <select 
                  disabled={!isGerente}
                  value={publicData.unidade_id} 
                  onChange={(e) => setPublicData({...publicData, unidade_id: e.target.value})} 
                  className="w-full h-11 rounded-xl border px-3 bg-muted/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione...</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
             </div>
             <div className="flex items-center justify-between gap-4 border p-4 rounded-xl">
               <div className="space-y-0.5">
                  <Label>Status Ativo</Label>
                  <p className="text-[10px] text-muted-foreground">Define se aparece na contagem.</p>
               </div>
               <Switch checked={publicData.active} onCheckedChange={(val) => setPublicData({...publicData, active: val})} />
             </div>
           </div>
           <DialogFooter><Button onClick={savePublic} disabled={loading} className="rounded-xl bg-blue-600 font-bold">Salvar Público</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Modal */}
      <Dialog open={userDialogOpen} onOpenChange={(val) => { setUserDialogOpen(val); if (!val) setUserError(null); }}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {userError && <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-bold border border-rose-100 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{userError}</div>}
            <div className="space-y-2"><Label>Nome Completo</Label><Input value={userData.full_name} onChange={(e) => setUserData({...userData, full_name: e.target.value})} /></div>
            <div className="space-y-2"><Label>E-mail (Login)</Label><Input value={userData.email} onChange={(e) => setUserData({...userData, email: e.target.value})} /></div>
            <div className="space-y-2"><Label>WhatsApp</Label><Input value={userData.whatsapp} onChange={(e) => setUserData({...userData, whatsapp: maskPhone(e.target.value)})} /></div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <select value={userData.role} onChange={(e) => setUserData({...userData, role: e.target.value})} className="w-full h-11 rounded-xl border px-3">
                <option value="nutricionista">Nutricionista</option>
                <option value="administrativo">Administrativo</option>
                <option value="gerente">Gerente</option>
              </select>
            </div>
            {userData.role !== 'gerente' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <Label className="font-bold text-blue-600">Unidade Vinculada</Label>
                <select 
                  value={userData.unidade_id} 
                  onChange={(e) => setUserData({...userData, unidade_id: e.target.value})} 
                  className="w-full h-11 rounded-xl border-blue-200 border-2 px-3 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Selecione a Unidade...</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            {userData.role === 'nutricionista' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <Label className="font-bold text-blue-600">Registro CRN</Label>
                <Input placeholder="Ex: CRN-6 12345" value={userData.crn} onChange={(e) => setUserData({...userData, crn: e.target.value})} className="border-blue-200 focus:border-blue-500" />
              </div>
            )}
            {!editingUser && <div className="space-y-2"><Label>Senha Provisória</Label><Input type="password" value={userData.password} onChange={(e) => setUserData({...userData, password: e.target.value})} /></div>}
          </div>
          <DialogFooter><Button onClick={saveUser} disabled={loading} className="rounded-xl bg-blue-600 font-bold">Salvar Usuário</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
