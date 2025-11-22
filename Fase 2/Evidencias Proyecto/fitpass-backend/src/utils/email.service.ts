// src/services/email/email.service.ts
import nodemailer from 'nodemailer';
import { UserRow } from '../repositories/user/user.repository';
import { UserMembershipRow } from '../repositories/membership/user-membership.repository';
import { MembershipPaymentRow } from '../repositories/membership/membership-payment.repository';
import { MembershipPlan } from '../repositories/membership/membership-plan.repository';
import { logger } from './logger';

export class EmailService {
  private transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST ?? 'smtp.office365.com',
    port: Number(process.env.MAIL_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  public async sendPresentialSaleEmail(input: {
    user: UserRow;
    membership: UserMembershipRow;
    payment: MembershipPaymentRow;
    plan: MembershipPlan;
    tempPassword: string;
  }): Promise<void> {
    const { user, membership, payment, plan, tempPassword } = input;

    const subject = 'Tu nueva membresía en Gym Health';

    const startDate = membership.start_date instanceof Date
      ? membership.start_date.toISOString().slice(0, 10)
      : String(membership.start_date);

    const endDate = membership.end_date instanceof Date
      ? membership.end_date.toISOString().slice(0, 10)
      : String(membership.end_date);

    const text = `Hola ${user.first_name},

Hemos registrado tu membresía "${plan.name}".

Detalle de la venta:
- Plan: ${plan.name} (${plan.code})
- Monto pagado: ${payment.amount} ${payment.currency}
- Inicio: ${startDate}
- Fin: ${endDate}

Tus credenciales de acceso:
- Usuario: ${user.email}
- Contraseña provisional: ${tempPassword}

Te recomendamos iniciar sesión y cambiar tu contraseña lo antes posible.

Atentamente,
Gym Health`;

    const html = `
      <p>Hola <strong>${user.first_name}</strong>,</p>
      <p>Hemos registrado tu membresía <strong>${plan.name}</strong>.</p>
      <p><strong>Detalle de la venta:</strong></p>
      <ul>
        <li>Plan: ${plan.name} (${plan.code})</li>
        <li>Monto pagado: ${payment.amount} ${payment.currency}</li>
        <li>Inicio: ${startDate}</li>
        <li>Fin: ${endDate}</li>
      </ul>
      <p><strong>Tus credenciales de acceso:</strong></p>
      <ul>
        <li>Usuario: ${user.email}</li>
        <li>Contraseña provisional: <code>${tempPassword}</code></li>
      </ul>
      <p>Te recomendamos iniciar sesión y cambiar tu contraseña lo antes posible.</p>
      <p>Atentamente,<br/>Gym Health</p>
    `;

    await this.transporter.sendMail({
      from: process.env.MAIL_USER ?? 'noresponder@energy.cl',
      to: user.email,
      subject,
      text,
      html,
    });

    logger.info(`✉️ Correo de venta presencial enviado a ${user.email}`);
  }
}
