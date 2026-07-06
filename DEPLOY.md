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

Atualizar codigo da EC2 com o que esta no GitHub:
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

## FRONTEND (nginx)

Copiar arquivos do frontend para o nginx:
```
sudo cp -r ~/ServeApp/escala-frontend/* /var/www/html/
```

Limpar arquivos desnecessarios:
```
sudo rm -rf /var/www/html/node_modules /var/www/html/package*.json /var/www/html/tsconfig.json
```

Testar configuracao do nginx:
```
sudo nginx -t
```

Reiniciar nginx:
```
sudo systemctl restart nginx
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

### Logging estruturado JSON (Fase 9)
Adicionar `SPRING_PROFILES_ACTIVE=prod` em `/etc/serve-backend.env` ativa o log em
**JSON** (pronto para ELK/CloudWatch/journald), com `requestId`/`userId`/`action`/`ip`
como campos e mascaramento automático de senha/token/e-mail/CPF (ver
`logback-spring.xml` e `PLANO DE ACAO.md` — Fase 9). **Sem essa variavel, o backend
continua com log em texto legivel** (comportamento anterior, preservado como fallback
seguro) — nao e obrigatorio, mas recomendado em producao.

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

## FLUXO COMPLETO DE DEPLOY (frontend + backend)

1. Conectar na EC2:
   ```
   ssh -i C:\Users\Gustavo\Documents\Projects\Serve\serve-key.pem ubuntu@3.130.130.103
   ```

2. Atualizar repositorio:
   ```
   cd ~/ServeApp
   git pull
   ```

3. Build do backend (se houve mudancas em Java):
   ```
   cd escala-backend
   ./mvnw clean package -DskipTests
   sudo systemctl restart serve-backend
   sudo journalctl -u serve-backend -n 30 --no-pager
   ```

4. Atualizar frontend:
   ```
   cd ~/ServeApp
   sudo cp -r escala-frontend/* /var/www/html/
   sudo rm -rf /var/www/html/node_modules /var/www/html/package*.json /var/www/html/tsconfig.json
   ```

5. Testar em https://serveapp.com.br

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
| Frontend | /var/www/html/ |
