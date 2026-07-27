# COMANDOS DE DEPLOY - SERVE APP
serveapp.com.br | EC2: 3.130.130.103

---

## CONEXAO SSH (PowerShell)

Conectar na EC2:
```
ssh -i C:\Users\Gustavo\Documents\Projects\Serve\serve-key.pem ubuntu@3.130.130.103
```

Ajustar permissoes da chave (so precisa fazer uma vez):
```
icacls "C:\caminho\serve-key.pem" /inheritance:r
icacls "C:\caminho\serve-key.pem" /grant:r "$($env:USERNAME):R"
```

---

## REPOSITORIO

> **Atencao:** o `git pull` na EC2 atualmente **falha** (`could not read Username for
> 'https://github.com'`) porque o remote e HTTPS e nao ha credencial salva no servidor.
> Isso **nao afeta o deploy do frontend**, que e buildado fora da EC2 (ver secao FRONTEND).
> Para corrigir o pull no servidor: trocar o remote para SSH com deploy key
> (`git remote set-url origin git@github.com:GustavoWachholz/ServeApp.git`) ou configurar
> um Personal Access Token. So e necessario se voce for buildar o backend na EC2.

Atualizar codigo da EC2 com o que esta no GitHub (apos corrigir a auth acima):
```
cd ~/ServeApp
git pull
```

Verificar branch atual:
```
git branch
```

Trocar de branch:
```
git checkout nome-da-branch
```

---

## BACKEND (Spring Boot)

Build do projeto (gera o .jar):
```
cd ~/ServeApp/escala-backend
./mvnw clean package -DskipTests
```

Reiniciar o servico:
```
sudo systemctl restart serve-backend
```

Ver status do servico:
```
sudo systemctl status serve-backend
```

Ver logs em tempo real:
```
sudo journalctl -u serve-backend -f
```

Ver ultimas 30 linhas do log:
```
sudo journalctl -u serve-backend -n 30 --no-pager
```

---

## FRONTEND (React — nginx)

> **Frontend ativo: `escala-frontend-react/` (React 19 + Vite).** O cutover ja foi feito:
> o nginx serve o SPA React de `/var/www/html` (bloco HTTPS `serveapp.com.br`, com
> `try_files $uri $uri/ /index.html` para o roteamento client-side).
>
> **A EC2 NAO tem Node/npm** — o build **nao** roda no servidor. O fluxo e:
> buildar o `dist/` **fora da EC2** (maquina local ou CI) e enviar o conteudo para
> `/var/www/html`. O frontend legado `escala-frontend/` (vanilla) esta descontinuado
> e nao deve mais ser copiado para o webroot.

### 1. Build local (na maquina de desenvolvimento, que tem Node)
```
cd escala-frontend-react
npm ci                 # (na primeira vez / apos mudar dependencias)
npm run build          # gera escala-frontend-react/dist/  (index.html + assets/)
```

### 2. Empacotar e enviar o dist para a EC2 (PowerShell/local)
```
tar -czf /tmp/serve-dist.tgz -C escala-frontend-react/dist .
scp -i C:\Users\Gustavo\Documents\Projects\Serve\serve-key.pem /tmp/serve-dist.tgz ubuntu@3.130.130.103:/home/ubuntu/serve-dist.tgz
```

### 3. Publicar no webroot (na EC2, com backup reversivel)
```
# extrai o build para um diretorio temporario
rm -rf ~/dist_new && mkdir -p ~/dist_new && tar -xzf ~/serve-dist.tgz -C ~/dist_new

# backup do webroot atual (rollback: restaurar esta pasta sobre /var/www/html)
sudo cp -a /var/www/html /var/www/html.bak-$(date +%Y%m%d-%H%M%S)

# sincroniza (remove arquivos antigos com --delete) e ajusta o dono
sudo rsync -a --delete ~/dist_new/ /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# limpa temporarios
rm -f ~/serve-dist.tgz && rm -rf ~/dist_new
```

### 4. Testar e recarregar o nginx
```
sudo nginx -t
sudo systemctl reload nginx      # (ou: sudo systemctl restart nginx)
```

### 5. Verificar em producao
```
curl -s -o /dev/null -w "%{http_code}\n" https://serveapp.com.br
curl -s https://serveapp.com.br | grep -oE 'assets/index-[A-Za-z0-9_-]+\.(js|css)'
# os hashes devem bater com os do build local (dist/assets/index-*.js|css)
```

### Rollback
```
# restaura o backup mais recente sobre o webroot
sudo rsync -a --delete /var/www/html.bak-AAAAMMDD-HHMMSS/ /var/www/html/
sudo systemctl reload nginx
```

---

## VARIAVEIS DE AMBIENTE

Editar variaveis de ambiente do backend:
```
sudo nano /etc/serve-backend.env
```

Ver conteudo atual:
```
sudo cat /etc/serve-backend.env
```

---

## SSL (Certbot)

Renovar certificado manualmente (normalmente e automatico):
```
sudo certbot renew
```

Testar renovacao sem aplicar:
```
sudo certbot renew --dry-run
```

---

## BANCO DE DADOS (MySQL via RDS)

Conectar no banco remoto:
```
mysql -h serve-db.cpeumcui21gq.us-east-2.rds.amazonaws.com -P 3306 -u admin -p'SENHA' serve
```

Dentro do MySQL:
```
SHOW DATABASES;
SHOW TABLES;
exit;
```

---

## UTILITARIOS GERAIS

Listar arquivos:
```
ls
ls /var/www/html/
```

Ver conteudo de arquivo:
```
cat nome-do-arquivo
```

Editar arquivo:
```
sudo nano nome-do-arquivo
```

Buscar texto em arquivos:
```
grep -rn "texto-buscado" /caminho/
```

Verificar porta em uso:
```
sudo ss -tlnp | grep 8080
```

---

## FLUXO COMPLETO DE DEPLOY

### Frontend (React) — buildado FORA da EC2
1. **Local:** buildar e empacotar
   ```
   cd escala-frontend-react && npm ci && npm run build
   tar -czf /tmp/serve-dist.tgz -C dist .
   scp -i C:\Users\Gustavo\Documents\Projects\Serve\serve-key.pem /tmp/serve-dist.tgz ubuntu@3.130.130.103:/home/ubuntu/serve-dist.tgz
   ```
2. **EC2:** publicar com backup
   ```
   rm -rf ~/dist_new && mkdir -p ~/dist_new && tar -xzf ~/serve-dist.tgz -C ~/dist_new
   sudo cp -a /var/www/html /var/www/html.bak-$(date +%Y%m%d-%H%M%S)
   sudo rsync -a --delete ~/dist_new/ /var/www/html/ && sudo chown -R www-data:www-data /var/www/html
   sudo nginx -t && sudo systemctl reload nginx
   rm -f ~/serve-dist.tgz && rm -rf ~/dist_new
   ```
3. **Verificar** em https://serveapp.com.br (ver secao FRONTEND, passo 5).

### Backend (Spring Boot) — buildado na EC2
> So funciona se o `git pull` na EC2 estiver com auth corrigida (ver secao REPOSITORIO)
> **e** houver JDK/Maven wrapper no servidor.
1. Conectar: `ssh -i C:\Users\Gustavo\Documents\Projects\Serve\serve-key.pem ubuntu@3.130.130.103`
2. Atualizar repo: `cd ~/ServeApp && git pull`
3. Build + restart:
   ```
   cd escala-backend
   ./mvnw clean package -DskipTests
   sudo systemctl restart serve-backend
   sudo journalctl -u serve-backend -n 30 --no-pager
   ```

---

## INFORMACOES DA INFRAESTRUTURA

| Item | Valor |
|---|---|
| Dominio | serveapp.com.br |
| IP fixo | 3.130.130.103 (Elastic IP) |
| EC2 | serve-backend \| t2.micro \| us-east-2 \| Ubuntu 24.04 |
| RDS | serve-db.cpeumcui21gq.us-east-2.rds.amazonaws.com \| MySQL 8 \| us-east-2 |
| Banco | serve |
| Chave SSH | C:\Users\Gustavo\Documents\Projects\Serve\serve-key.pem |
| Certificado | Let's Encrypt via Certbot \| expira 2026-09-14 (renovacao automatica) |
| Backend | porta 8080 (interno) \| proxy via nginx porta 443/80 |
| Servico | serve-backend.service (systemd) |
| Env file | /etc/serve-backend.env |
| Frontend | React (`escala-frontend-react`) buildado fora da EC2; `dist/` servido de /var/www/html/ (SPA) |
| Node na EC2 | ausente (build do frontend nao roda no servidor) |
