# Ticket City - Technical Documentation (React Vite)

## Project Overview

Ticket City is a blockchain-based event ticketing platform built with React Vite. It enables event organizers to create events and sell tickets as NFTs while ensuring secure transactions using ETN.

## Key Features

- Event creation with flexible ticket types (FREE/PAID).
- Ticket categories: Regular and VIP for paid events.
- Secure transactions through ETN payments.
- Attendance tracking and verification.
- NFT-based ticket issuance.
- Automated ticket pricing (Future Feature).
- Event discovery tools (Future Feature).
- Stablecoin payments (Future Feature).

## Prerequisites

- Node.js (v16+)
- npm or yarn
- Git
- ANKR RPC (Electroneum Testnet)

## Installation & Setup

```bash
# Clone repository
git clone https://github.com/DevBigEazi/TicketCityFrontend
cd TicketCityFrontend

# Install dependencies
yarn install

# Copy environment file contents
cp .env.example
.env.local is the original file

# Start development server
yarn dev
```

## React Component Structure

### Event Creation Flow

1. **CreateEventFormComponent**: Handles event input fields and validation.
2. **EventPreview**: Displays entered event details for review.
3. **CreateTicketComponent**: Allows organizers to define ticket categories.
4. **handleSubmit**: Calls smart contract functions (`createEvent` and `createTicket`).
5. **useMulticall**: Ensures atomic transaction execution.
6. **EventListComponent**: Fetches and displays created events.

### Ticket Purchase Flow

1. **TicketPurchaseComponent**: Handles user interaction for ticket buying.
2. **validatePayment**: Verifies ETN transaction.
3. **MintTicketNFT**: Issues NFT-based tickets upon successful payment.
4. **updateEventRecords**: Updates event database with new ticket holders.

### Authentication Flow

- **Web2 Auth**: Creates an embedded EVM wallet for users.
- **Web3 Auth**: Direct wallet connection for guest users.

## Revenue Management

- ETN payments held securely in smart contract.
- Minimum 60% attendance requirement for revenue release.
- Automatic or manual revenue release post-event.

## Event Verification

- QR code or wallet authentication.
- Attendee-controlled attendance marking.
- Bulk verification support (Future Feature).

## Error Handling

- Comprehensive form validation.
- Secure API interactions.
- User-friendly error messages.

## Development Workflow

### Contributing Guidelines

- Use GitHub Issues for tracking.
- Follow feature-based branch naming (`feature/issue-number-description`).
- Run tests before submitting PRs&#x20;
- Provide detailed PR descriptions.

### Code Standards

- Maintain clean React component structure.
- Optimize API calls and contract interactions.
- Follow best practices for UI/UX consistency.

## Support & Resources

- **GitHub Issues**: For reporting bugs and requesting features.
- **Telegram Community**: General discussions and support.
- **Documentation**: Guides and API references.

For additional support:

1. Check documentation.
2. Search closed issues.
3. Join Telegram community.
4. Contact @DevBigEazi.

## Test Coverage

## License

MIT Licensed
