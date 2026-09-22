# Snowy Alpha 0.1

Primeiro build funcional do Milestone 001 — **SNOWY IS ALIVE**.

## O que já funciona
- onboarding Snowy
- prioridade inicial
- Home mobile-first
- conversa local
- memória persistente no navegador (localStorage)
- Snowy DNA inicial com confiança
- Snowy Watch básico
- Minha Vida básica
- Snowy Lab / Snowy Moment
- manifest + service worker para PWA
- nenhum dado é enviado para servidores nesta versão

## Rodar localmente
Na pasta do projeto:

```bash
python3 -m http.server 8080
```

Abra `http://localhost:8080` no computador.

## Importante
Esta Alpha ainda **não usa um modelo de IA externo** e **não monitora em segundo plano**. Isso é intencional: este build valida interface, persistência, DNA/Watch e a base do Milestone 001 sem custo e sem expor dados.

Para instalar como PWA no iPhone de forma confiável, o próximo passo é publicar este build em HTTPS (podemos usar um serviço com free tier) e então usar Safari > Compartilhar > Adicionar à Tela de Início.
