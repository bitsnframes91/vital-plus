import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Setze dein Passwort für {siteName} zurück</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Passwort zurücksetzen</Heading>
        <Text style={text}>
          Wir haben eine Anfrage zum Zurücksetzen deines Passworts für {siteName}
          erhalten. Klicke auf die Schaltfläche unten, um ein neues Passwort zu wählen.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Passwort zurücksetzen
        </Button>
        <Text style={footer}>
          Falls du das Zurücksetzen des Passworts nicht angefordert hast, kannst du
          diese E-Mail einfach ignorieren. Dein Passwort wird nicht geändert.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Plus Jakarta Sans", Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#7AC943',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #7AC943',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #7AC943 !important; color: #ffffff !important; }
  }
  [data-ogsc] .dm-btn { background-color: #7AC943 !important; color: #ffffff !important; }
  [data-ogsb] .dm-btn { background-color: #7AC943 !important; color: #ffffff !important; }
`
