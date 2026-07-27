export interface PermissaoDTO {
  tela: string;
  acessar: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
}

export interface UsuarioResponseDTO {
  id: number;
  nome: string;
  email: string;
  tema: string;
  corPrimaria: string;
  role: string;
  foto: string | null;
  permissoes: PermissaoDTO[];
  token: string;
}

export interface SessionData {
  id: number;
  nome: string;
  email: string;
  tema: string;
  corPrimaria: string;
  role: string;
  permissoes: PermissaoDTO[];
  token: string;
}

export interface ServoDTO {
  id: number;
  nome: string;
  telefone: string;
  email: string;
  dataNascimento: string;
  genero: string;
  areas: string[];
  classificacoes: string[];
  escalado: boolean;
}

export interface AreaDTO {
  id: number;
  nome: string;
  tipo: string;
  exclusivoNaEscala: boolean;
  liderId: number | null;
  liderNome: string | null;
  coLiderId: number | null;
  coLiderNome: string | null;
  membros?: { nome: string; vezesEscalado: number }[];
}

export interface MinisterioDTO {
  id: number;
  classificacao: string;
  nome: string;
  titulo: string;
  nomeOrganizacao: string;
  nomeSetor: string;
  cor: string;
  areas: AreaDTO[];
}

export interface MinisterioRequest {
  nome: string;
  titulo: string;
  nomeOrganizacao: string;
  nomeSetor: string;
  cor: string;
  areaIds: number[];
}

export interface AvisoDTO {
  id: number;
  titulo: string;
  texto: string;
  data: string;
  validade: string;
  autor: string;
}

export interface AvisoRequest {
  titulo: string;
  texto: string;
  validade: string | null;
}

export interface ConfiguracaoIgrejaDTO {
  id: number;
  nome: string;
  telefone: string;
  endereco: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
  youtube: string;
  site: string;
}

export interface AtribuicaoDTO {
  servoId: number;
  servoNome: string;
  funcao: string;
  /** Calculado no backend: servo indisponível na data desta escala (só na resposta). */
  indisponivel?: boolean;
}

export interface EscalaDTO {
  id: number;
  titulo: string;
  dataEscala: string;
  dataFim: string;
  cor: string;
  status: string;
  classificacao: string;
  atribuicoes: AtribuicaoDTO[];
}

export interface MinhaEscalaDTO {
  id: number;
  titulo: string;
  dataEscala: string;
  dataFim: string;
  funcao: string;
}

export interface AniversarianteDTO {
  nome: string;
  mes: number;
  dia: number;
  foto: string | null;
}

export interface DashboardResponse {
  nomeUsuario: string;
  areas: string[];
  avisos: AvisoDTO[];
  minhasEscalas: MinhaEscalaDTO[];
  aniversariantes: AniversarianteDTO[];
  tema: string;
  corPrimaria: string;
}

export interface FrequenciaDTO {
  servoId: number;
  servoNome: string;
  total: number;
}

export interface RegistroAuditoriaDTO {
  id: number;
  dataHora: string;
  usuarioId: number;
  usuarioNome: string;
  modulo: string;
  acao: string;
  descricao: string;
  entidadeId: number;
  metodoHttp: string;
  caminho: string;
  statusHttp: number;
  ip: string;
}

export interface UsuarioListItemDTO {
  id: number;
  nome: string;
  email: string;
  role: string;
  permissoes: PermissaoDTO[];
  servoId: number | null;
  servoNome: string | null;
}

export interface PerfilDTO {
  id: number;
  nome: string;
  email: string;
  role: string;
  foto: string | null;
  telefone: string;
  genero: string;
  dataNascimento: string;
  permissoes: PermissaoDTO[];
  servoId: number | null;
  servoNome: string | null;
}

export interface CadastroRequest {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  dataNascimento: string;
  genero: string;
  consentimento: boolean;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface IndisponibilidadeDTO {
  id: number;
  dataInicio: string;
  dataFim: string | null;
  motivo: string | null;
  servoId?: number;
  servoNome?: string;
}

/** Payload de criação/edição — só os campos editáveis pelo usuário. */
export interface IndisponibilidadeRequest {
  dataInicio: string;
  dataFim: string | null;
  motivo: string | null;
}

/** Escala em conflito com uma indisponibilidade (modal de confirmação). */
export interface EscalaConflitoDTO {
  escalaId: number;
  titulo: string;
  dataEscala: string;
}

export type NotificacaoTipo = 'ESCALA_ADICIONADA' | 'INDISPONIBILIDADE_REGISTRADA';

export interface NotificacaoDTO {
  id: number;
  tipo: NotificacaoTipo;
  lida: boolean;
  criadoEm: string;
  referenciaId: number | null;
  // ESCALA_ADICIONADA
  titulo: string | null;
  ministerio: string | null;
  dataHora: string | null;
  area: string | null;
  // INDISPONIBILIDADE_REGISTRADA
  servoNome: string | null;
  periodo: string | null;
  motivo: string | null;
}
