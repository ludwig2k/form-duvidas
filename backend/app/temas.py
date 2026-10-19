"""Catálogo de temas e opções do formulário (fonte única para frontend e validação)."""

MAX_TEMAS = 5
OUTRO_PONTO = "Outro ponto"

PERFIS = [
    "Liderança titular",
    "Liderança substituta",
    "Representante da liderança",
    "Amigo da GGDP",
    "Outro",
]

DIFICULDADES = [
    "Não sei onde encontrar a informação",
    "Não sei qual área procurar",
    "Tenho dificuldade para interpretar normas",
    "O fluxo ou procedimento não está claro",
    "As informações estão distribuídas em diferentes lugares",
    "Tenho receio de transmitir uma informação incorreta",
    "Normalmente encontro a informação de que preciso",
    "Outra",
]

RECURSOS = [
    "Guias rápidos",
    "Fluxogramas",
    "Perguntas frequentes - FAQ",
    "Manuais",
    "Vídeos curtos",
    "Comunicados",
    "Calendário de prazos",
    "Capacitações presenciais",
    "Capacitações on-line",
    "Página única com informações e serviços",
    "Canal para esclarecimento de dúvidas",
]

TEMAS = {
    "ferias": {
        "title": "Férias",
        "desc": "Solicitação, alteração, prazos e organização da equipe",
        "items": ["Regras e critérios", "Prazos", "Como realizar a solicitação", "Alteração ou cancelamento", "Responsabilidades da liderança", "Organização das férias da equipe", "Como acompanhar a solicitação", "Situações excepcionais"],
    },
    "frequencia": {
        "title": "Frequência e ponto eletrônico",
        "desc": "Horários, justificativas, banco de horas e compensações",
        "items": ["Grades e horários de trabalho", "Registro e tratamento do ponto", "Justificativas de frequência", "Banco de horas", "Compensação de horas", "Atrasos, faltas e outras ocorrências", "Responsabilidades da liderança", "Prazos e fechamento"],
    },
    "gratificacoes": {
        "title": "Gratificações",
        "desc": "Critérios, concessão, responsabilidades e procedimentos",
        "items": ["Tipos de gratificação", "Critérios para concessão", "Quem pode solicitar", "Quem analisa ou autoriza", "Procedimento de solicitação", "Documentos necessários", "Responsabilidades da liderança", "Alteração ou encerramento da gratificação"],
    },
    "atestados": {
        "title": "Atestados e afastamentos",
        "desc": "Prazos, procedimentos, responsabilidades e acompanhamento",
        "items": ["Como e onde apresentar atestado", "Prazos", "Responsabilidades do servidor", "Responsabilidades da liderança", "Acompanhamento do afastamento", "Afastamentos prolongados", "Afastamentos recorrentes na equipe", "Tipos de afastamento"],
    },
    "licencas": {
        "title": "Licenças",
        "desc": "Tipos, requisitos, prazos, documentos e autorizações",
        "items": ["Tipos de licença", "Requisitos", "Prazos", "Documentos necessários", "Como solicitar", "Quem analisa ou autoriza", "Responsabilidades da liderança", "Planejamento da ausência do servidor"],
    },
    "aposentadoria": {
        "title": "Aposentadoria",
        "desc": "Planejamento, requisitos, regras, documentos e acompanhamento",
        "items": ["Planejamento para aposentadoria", "Requisitos", "Regras e legislação", "Documentos necessários", "Como solicitar", "Onde buscar orientação", "Acompanhamento do processo", "Prazos e etapas"],
    },
    "folha": {
        "title": "Folha de pagamento e descontos",
        "desc": "Contracheque, descontos, fechamento e correções",
        "items": ["Consulta e compreensão do contracheque", "Descontos", "Prazos de fechamento da folha", "Quando uma alteração passa a constar na folha", "Pagamentos retroativos", "Reflexos de férias, frequência ou afastamentos", "Divergências no pagamento", "Onde solicitar esclarecimento ou correção"],
    },
    "necessidade_pessoal": {
        "title": "Necessidade de pessoal",
        "desc": "Formalização da demanda, análise e acompanhamento",
        "items": ["Como formalizar a necessidade", "Para quem encaminhar", "Quais informações devem constar na solicitação", "Como a necessidade é analisada", "Quais formas de atendimento podem existir", "Como acompanhar a demanda", "Responsabilidades da liderança"],
    },
    "movimentacao": {
        "title": "Movimentação de servidores",
        "desc": "Fluxos, responsabilidades, requisitos e comunicação",
        "items": ["Quando a movimentação pode ocorrer", "Como iniciar a solicitação", "Quem analisa ou autoriza", "Documentos e informações necessárias", "Responsabilidades da liderança", "Prazos", "Como acompanhar a demanda"],
    },
    "desligamento": {
        "title": "Desligamento ou exoneração",
        "desc": "Procedimentos, prazos, comunicação e providências",
        "items": ["Como iniciar o procedimento", "Quem deve ser comunicado", "Responsabilidades da liderança", "Documentos ou informações necessárias", "Prazos", "Frequência e registros funcionais", "Acessos, bens e outras providências", "Comunicação com o servidor"],
    },
    "direitos_beneficios": {
        "title": "Direitos e benefícios",
        "desc": "Critérios, solicitações, documentos e acompanhamento",
        "items": ["Quais direitos e benefícios existem", "Quem tem direito", "Como solicitar", "Documentos necessários", "Prazos", "Como acompanhar a solicitação", "Onde buscar orientação"],
    },
    "capacitacao": {
        "title": "Capacitação e desenvolvimento",
        "desc": "Inscrições, autorizações, trilhas e desenvolvimento",
        "items": ["Como solicitar participação em capacitações", "Critérios e autorizações", "Inscrições e vagas", "Certificados", "Trilhas de aprendizagem", "Planejamento de desenvolvimento", "Capacitações específicas da unidade"],
    },
    "documentacao": {
        "title": "Documentação funcional",
        "desc": "Dossiê, documentos, atualização e consulta",
        "items": ["Quais documentos precisam ser apresentados", "Onde encaminhar documentos", "Atualização de dados funcionais", "Consulta ao dossiê funcional", "Prazos", "Correção de informações", "Responsabilidades do servidor e da liderança"],
    },
    "qvt": {
        "title": "Ações e eventos de qualidade de vida e integração",
        "desc": "Dúvidas sobre inscrições, datas, público-alvo e participação",
        "items": ["Inscrições", "Datas e cronograma", "Público-alvo", "Critérios de participação", "Divulgação das ações", "Locais e formatos", "Lista de presença ou confirmação", "Outras informações sobre eventos e ações"],
    },
    "outro": {
        "title": "Outro assunto",
        "desc": "Tema de Gestão de Pessoas não listado acima",
        "items": ["Normas e regras", "Prazos", "Fluxos e procedimentos", "Responsabilidades", "Comunicação e orientação"],
    },
}


def catalogo() -> dict:
    return {
        "max_temas": MAX_TEMAS,
        "outro_ponto": OUTRO_PONTO,
        "perfis": PERFIS,
        "dificuldades": DIFICULDADES,
        "recursos": RECURSOS,
        "temas": [{"key": k, **v} for k, v in TEMAS.items()],
    }
