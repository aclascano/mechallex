import { Mail, MessageCircle, Phone, Smartphone } from 'lucide-react'
import type { Canal } from '../domain/tipos'

export const ICONO_CANAL: Record<Canal, typeof Phone> = { Llamada: Phone, SMS: Smartphone, WhatsApp: MessageCircle, Correo: Mail }
