# Agendador de Tarefas (Windows) — Scrape a cada 30 min (9h10 às 23h)

## 1. Abrir o Agendador de Tarefas

- Pressione **Win + R**, digite `taskschd.msc` e Enter  
  **ou**  
- Pesquise por **“Agendador de Tarefas”** no menu Iniciar

---

## 2. Criar a tarefa

1. No painel direito, clique em **“Criar Tarefa…”** (não use “Criar Tarefa Básica”).
2. **Aba Geral**
   - Nome: `Scrape Vagas SEE/MG`
   - Marque: **“Executar estando o usuário conectado ou não”** (recomendado para rodar com o PC bloqueado)
   - Marque: **“Executar com privilégios mais altos”** só se precisar (geralmente não)

---

## 3. Gatilho (horário)

1. Aba **Gatilhos** → **Novo…**
2. Configure:
   - **Iniciar a tarefa:** “Agendado”
   - **Configurações:** “Diariamente”
   - **Iniciar:** escolha **09:10:00** (e a data de hoje)
   - Marque **“Repetir a tarefa a cada:”** → **30 minutos**
   - **Durante:** **13 horas e 50 minutos** (assim termina às 23h)
   - **Ativado** marcado
3. Clique em **OK**

*(Assim a tarefa roda às 9:10, 9:40, 10:10 … até 22:40, 23:10. O “durante” limita até por volta das 23h.)*

---

## 4. Ação (o que executar)

1. Aba **Ações** → **Novo…**
2. Configure:
   - **Ação:** “Iniciar um programa”
   - **Programa/script:** cole o **caminho completo** do arquivo `.bat`, por exemplo:  
     `C:\Users\leofs\Documents\painel-vagas\scripts\run-scrape-agendado.bat`  
     *(troque `leofs` pelo seu usuário do Windows, se for o caso)*
   - **Iniciar em (opcional):**  
     `C:\Users\leofs\Documents\painel-vagas`  
     *(raiz do projeto — mesmo caminho, sem o `\scripts\run-scrape-agendado.bat`)*
3. Clique em **OK**

---

## 5. Condições (opcional)

- Na aba **Condições**, desmarque **“Iniciar a tarefa somente se o computador estiver conectado à energia CA”** se quiser que rode também na bateria (notebook).
- Pode deixar **“Acordar o computador para executar esta tarefa”** desmarcado.

---

## 6. Configurações

- Aba **Configurações**: marque **“Permitir que a tarefa seja executada sob demanda”** (para testar manualmente).
- Clique em **OK** e informe a senha do Windows se pedir.

---

## Testar

- No Agendador de Tarefas, clique com o botão direito na tarefa **“Scrape Vagas SEE/MG”** → **Executar**.
- Verifique o log:  
  `scripts\scrape-log.txt` (dentro da pasta do projeto)

---

## Resumo

| Item        | Valor |
|------------|--------|
| Início     | 9h10   |
| Repetir    | A cada 30 min |
| Durante    | 13h50 (até ~23h) |
| Script     | `scripts\run-scrape-agendado.bat` |
| Log        | `scripts\scrape-log.txt` |

O PC precisa estar **ligado** nos horários em que a tarefa está agendada.
