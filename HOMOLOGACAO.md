# Ambiente de Homologação (local + banco de produção)

Roda o Serve **localmente**, consumindo o **banco de produção (RDS)** através de um **túnel SSH** pela EC2. Ideal para validar comportamento com dados reais antes de subir para produção.

> ⚠️ **Cuidado:** escritas feitas aqui (criar/editar/excluir servos, escalas, avisos, etc.) vão para os **dados reais de produção**. O *schema* nunca é alterado (`ddl-auto=validate`), mas os *dados* são os mesmos de produção.

## Pré-requisitos
- Java 25 e Node.js (já instalados nesta máquina).
- `serve-key.pem` na raiz do projeto (já presente).
- Senha do usuário `admin` do RDS — obtida na EC2 com `sudo cat /etc/serve-backend.env`.
- Dependências do React instaladas: `cd ServeApp/escala-frontend-react && npm install` (já feito).

## Como rodar (caminho rápido)
Na raiz do projeto:
```bat
start-homolog.bat
```
Ele pede a senha do RDS, abre o túnel SSH, sobe o backend (profile `homolog`) e o frontend React. Ao final:
- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- Banco: RDS de produção via túnel (`localhost:3307`)

Feche as 3 janelas (túnel / backend / frontend) para encerrar.

## Como rodar (manual, passo a passo)
1. **Túnel SSH** (deixe a janela aberta):
   ```bat
   tunnel-homolog.bat
   ```
   Encaminha `localhost:3307` → `serve-db...rds.amazonaws.com:3306`.
2. **Backend** (nova janela):
   ```bat
   cd ServeApp\escala-backend
   set SPRING_PROFILES_ACTIVE=homolog
   set DB_URL=jdbc:mysql://localhost:3307/serve?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true&characterEncoding=UTF-8
   set DB_USERNAME=admin
   set DB_PASSWORD=<senha-do-rds>
   set JWT_SECRET=<segredo-com-32+-chars>
   mvnw.cmd spring-boot:run -Dspring-boot.run.jvmArguments="-Duser.timezone=America/Sao_Paulo"
   ```
3. **Frontend React** (nova janela):
   ```bat
   cd ServeApp\escala-frontend-react
   npm run dev
   ```

## Diferenças em relação ao dev local puro
| Item | Dev local (`start.bat`) | Homologação (`start-homolog.bat`) |
|---|---|---|
| Banco | MySQL local (`localhost:3306/serve`) | RDS de produção via túnel (`localhost:3307`) |
| `ddl-auto` | `update` (cria/altera tabelas) | `validate` (nunca altera o schema) |
| Profile Spring | default | `homolog` |
| Frontend | vanilla (live-server) | React (Vite) |

## Se o backend não subir por erro de validação de schema
`ddl-auto=validate` falha se as entidades do código local divergirem do schema do RDS. Isso é proposital (evita alteração acidental de produção). Opções:
- Alinhe o código local ao que está em produção; ou
- Como último recurso, troque `spring.jpa.hibernate.ddl-auto` para `none` em `application-homolog.properties` (não interage com o schema) — mas investigue a divergência antes.
