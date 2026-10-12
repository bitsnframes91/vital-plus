import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Du wurdest zu {siteName} eingeladen</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Du wurdest eingeladen</Heading>
        <Text style={text}>
          Du wurdest eingeladen,{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          beizutreten. Klicke auf die Schaltfläche unten, um die Einladung
          anzunehmen und dein Konto zu erstellen.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Einladung annehmen
        </Button>
        <Text style={footer}>
          Falls du diese Einladung nicht erwartet hast, kannst du diese E-Mail
          einfach ignorieren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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
const link = { color: 'inherit', textDecoration: 'underline' }
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
