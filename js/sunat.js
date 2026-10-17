// Contrato para una futura integración exclusivamente desde un backend seguro.
// Esta demo nunca realiza solicitudes a SUNAT ni maneja credenciales.
export const sunatGateway = {
  async send() {throw new Error('Envío a SUNAT no disponible en la demostración.');}
};
