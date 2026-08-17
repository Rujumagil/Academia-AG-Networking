# Agente Compás One · AG Business Networking

## Objetivo

Integrar el Chat Web de Compás One en la landing oficial de AG Business Networking para captar prospectos, registrar contactos en CRM, responder dudas generales y facilitar seguimiento o cita cuando exista intención clara.

## Workspace

- Workspace: `AG Business Networking`
- Modo del Super Agente: `supervised`
- Nombre visible del agente: `Asesor AG`
- Especialidad: `sales`
- Canal inicial: `web_chat`

## Widget

El widget se carga desde Compás One mediante `landing.js`.

- Script público: `https://app.proyectocompas.com/compas-chat.js`
- Public key: `wc_aa7383fbaabaca8e3f7e4be26704a0c8c0fc`
- Color principal: `#005134`
- Posición: derecha

La public key del widget no es una credencial privada. Nunca deben añadirse al repositorio claves `service_role`, contraseñas, secretos de Gemini/OpenAI ni otros tokens privados.

## Orígenes autorizados

- `https://rujumagil.github.io`
- `https://agbusinessnetworking.com`
- `https://www.agbusinessnetworking.com`

## Captación

Antes de iniciar conversación, el widget solicita:

- nombre;
- correo o teléfono;
- empresa/proyecto opcional;
- aceptación del aviso de privacidad.

Compás One registra o reutiliza el contacto dentro del workspace de AG, abre la conversación y conserva el historial.

## Conocimiento inicial

El agente tiene conocimiento aprobado sobre:

- propósito y propuesta de valor de AG Business Networking;
- servicios y red de proveedores;
- membresía empresarial y networking;
- Academia AG y formación en Utah;
- misión, visión y valores.

No debe inventar precios, descuentos, disponibilidad, acreditaciones ni condiciones de proveedores.

## Privacidad

El widget utiliza `aviso-privacidad.html` como aviso específico para contacto digital y chat web. Antes del lanzamiento definitivo debe revisarse legalmente y actualizarse con los datos corporativos oficiales que correspondan.

## Próxima fase

1. Probar captación real desde la URL pública.
2. Confirmar creación del contacto en CRM AG.
3. Confirmar conversación `Chat web · AG Business Networking`.
4. Revisar clasificación, lead score y etapa del Super Agente.
5. Probar handoff humano.
6. Ajustar preguntas y conocimiento con conversaciones reales.
7. Conectar disponibilidad/calendario cuando AG defina responsables y horarios.
