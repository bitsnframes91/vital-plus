import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  code?: string
}

const AccountDeletionCodeEmail = ({ code }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Dein Code zum Löschen deines FairvitalGO-Kontos</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Konto löschen bestätigen</Heading>
        <Text style={text}>
          Mit diesem Code bestätigst du, dass dein FairvitalGO-Konto und alle gespeicherten Daten dauerhaft gelöscht werden:
        </Text>
        <Text style={codeStyle}>{code ?? '------'}</Text>
        <Text style={footer}>
          Der Code ist 10 Minuten gültig und kann nur einmal verwendet werden. Falls du das Löschen nicht angefordert hast,
          ignoriere diese E-Mail und ändere am besten dein Passwort.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccountDeletionCodeEmail,
  subject: 'Dein Code zum Löschen des Kontos',
  displayName: 'Konto löschen – Bestätigungscode',
  previewData: { code: '123456' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Plus Jakarta Sans", Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1f2a12', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 25px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 'bold' as const, letterSpacing: '6px', color: '#1f2a12', margin: '0 0 30px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
