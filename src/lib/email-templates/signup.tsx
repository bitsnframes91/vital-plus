import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  recipient: string
  token?: string
}

/** Code-only confirmation: no link, so confirming never opens the phone's browser. */
export const SignupEmail = ({ siteName, recipient, token }: SignupEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Dein Bestätigungscode für {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Dein Bestätigungscode</Heading>
        <Text style={text}>
          Danke für deine Registrierung bei {siteName}! Gib diesen Code in der App ein, um deine E-Mail-Adresse ({recipient}) zu bestätigen:
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Falls du kein Konto erstellt hast, kannst du diese E-Mail einfach ignorieren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Plus Jakarta Sans", Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 25px' }
const codeStyle = { fontSize: '32px', fontWeight: 'bold' as const, letterSpacing: '8px', color: '#000000', margin: '0 0 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
