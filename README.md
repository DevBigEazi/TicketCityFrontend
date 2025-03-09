<<<<<<< HEAD
# Ticket City - Technical Documentation (React Vite)

## Project Overview
=======
# Ticket City - Frontend Documentation

'Ticket_City frontend successfully deployed to ICP canister local network': 'bkyz2-fmaaa-aaaaa-qaaaq-cai'.

'Ticket_City smart contract successfully deployed to Electroneum mainnet': '0x123bFf8D754b29772E1EfAD5B075F55600577DcD'.
>>>>>>> e0c61ebb534ba38a2aac8f98678e996f48fff2e9

Ticket City is a blockchain-based event ticketing platform built with React Vite. It enables event organizers to create events and sell tickets as NFTs while ensuring secure transactions using ETN.

## Key Features

<<<<<<< HEAD
- Event creation with flexible ticket types (FREE/PAID).
- Ticket categories: Regular and VIP for paid events.
- Secure transactions through ETN payments.
- Attendance tracking and verification.
- NFT-based ticket issuance.
- Automated ticket pricing (Future Feature).
- Event discovery tools (Future Feature).
- Stablecoin payments (Future Feature).
=======
1. `Ticket_City.sol`: Main contract handling event logic and ETN payments
2. `Ticket_NFT.sol`: Non-transferable NFT implementation for event tickets
3. `Types.sol`: Data structures and enums
4. `Errors.sol`: Custom error definitions
>>>>>>> e0c61ebb534ba38a2aac8f98678e996f48fff2e9

## Prerequisites

<<<<<<< HEAD
- Node.js (v16+)
- npm or yarn
- Git
- ANKR RPC (Electroneum Testnet)
=======
- NonReentrant guard for payment functions
- Event organizer verification
- Minimum attendance rate requirements
- Revenue release conditions

### Smart Contract Interactions

#### Event Creation Flow

```mermaid
graph TD
    A[Organizer] -->|Creates Event| B[Ticket_City Contract]
    B -->|Deploys| C[NFT Contract]
    B -->|Sets| D[Ticket Types]
    D -->|FREE| E[Single Ticket Type]
    D -->|PAID| F[Regular/VIP Options]
```

#### Ticket Purchase Flow

```mermaid
graph TD
    A[Attendee] -->|Sends ETN| B[Ticket_City Contract]
    B -->|Validates Payment| C[Payment Validation]
    C -->|Success| D[Mint NFT Ticket]
    D -->|Updates| E[Event Records]
```

#### Authentication Flow

- Web2-like auth flow during which an embedded evm wallet will be created for the users
- A web3 auth for guest users

### Key Features Implementations

- Event creation with flexible ticket types (FREE/PAID)
- Ticket categories: Regular and VIP for paid events
- Revenue management through ETN native token
- Attendance tracking and verification system
- Tickets issued as NFTs for security
- Automated ticket pricing based on demand (Future Implementation)
- Event discovery tools, including referral programs and discount codes (Future Implementation)
- Stablecoins payment (Future Implementation)

### Payments & Refunds

- Tickets purchased using ETN
- Organizers pay a small platform service fee (30 ETN) for paid events
- Ticket payments held safely until the event ends
- If an event is canceled, attendees get a refund plus a 2 ETN gas fee compensation from the organiser (Future Implementation)

### Revenue Management

- ETN payments held in contract
- 60% minimum attendance requirement
- Automated revenue release post-event
- Manual release option for owner

### Event Verification System

- Attendance tracked through QR codes or wallet authentication
- Attendee-controlled attendance marking
- Bulk verification support by an attendee that registered for others (Future Implementation)
- Attendance rate calculation
- Revenue release conditions

## Contract Constants

- `FREE_TICKET_PRICE`: 0 ETN
- `MINIMUM_ATTENDANCE_RATE`: 60%

## Error Handling

- Custom errors for gas optimization
- Comprehensive validation checks
- Secure payment processing

## Development Environment

### Prerequisites

- Node.js (v16 or higher)
- npm
- Git
- DFINITY SDK for Internet Computer (dfx)
- Vite for React development
>>>>>>> e0c61ebb534ba38a2aac8f98678e996f48fff2e9

## Installation & Setup

```bash
# Clone repository
<<<<<<< HEAD
git clone https://github.com/DevBigEazi/TicketCityFrontend
cd TicketCityFrontend

# Install dependencies
yarn install
=======
git clone https://github.com/CityBlockLab/Ticket_City_Frontend
cd Ticket_City_Frontend

# Install dependencies
npm install
>>>>>>> e0c61ebb534ba38a2aac8f98678e996f48fff2e9

# Copy environment file contents
cp .env.example
.env.local is the original file

# Start development server
<<<<<<< HEAD
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
=======
npm run dev
```

## Development Workflow

### Common Commands

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to ICP
dfx deploy
```

## Deployment Information

### Frontend Deployment on Internet Computer

The React frontend application is deployed as a canister on the Internet Computer Protocol (ICP) local development environment:

- Module hash: `865eb25df5a6d857147e078bb33c727797957247f7af2635846d65c5397b36a6`
- Frontend canister ID: `bkyz2-fmaaa-aaaaa-qaaaq-cai`
- Environment: Local development

#### Local Development URLs

- **Recommended**: http://bkyz2-fmaaa-aaaaa-qaaaq-cai.localhost:4943/
- Legacy: http://127.0.0.1:4943/?canisterId=bkyz2-fmaaa-aaaaa-qaaaq-cai

#### ICP Deployment Commands

```bash
# Start local ICP environment
dfx start --background

# Deploy to local environment
dfx deploy

# Deploy to mainnet
dfx deploy --network ic

# Check canister status
dfx canister status frontend
```

### ICP Security Notes

The project currently does not define a security policy for assets on the Internet Computer Protocol. It is recommended to define a security policy in `.ic-assets.json5`, for example:

```json
[
  {
    "match": "**/*",
    "security_policy": "standard"
  }
]
```

To disable the policy warning, define `"disable_security_policy_warning": true` in `.ic-assets.json5`.

## Contributing Guidelines

### Issue Management

1. **Creating Issues**

   - Use provided issue templates
   - Tag with appropriate labels
   - Include detailed description
   - Tag repository @devbigeazi

2. **Picking Issues**
   - Comment on the issue you want to work on
   - Wait for assignment
   - Tag repository @devbigeazi

### Branch Management

```bash
# Create new feature branch
git checkout -b feature/issue-number-description

# Create new bugfix branch
git checkout -b fix/issue-number-description

# Create new documentation branch
git checkout -b docs/issue-number-description
```

### Pull Request Process

1. **Before Submitting**

   - Run tests: `npx hardhat test`
   - Generate coverage: `npx hardhat coverage`
   - Update documentation if needed
   - Ensure clean compilation

2. **Submission Requirements**

   - Link related issue(s)
   - Provide detailed description
   - Include test results
   - Tag repository owner

3. **Review Process**
   - Address review comments
   - Update PR as needed
   - Maintain communication
>>>>>>> e0c61ebb534ba38a2aac8f98678e996f48fff2e9

### Code Standards

- Maintain clean React component structure.
- Optimize API calls and contract interactions.
- Follow best practices for UI/UX consistency.

<<<<<<< HEAD
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
=======
## Frontend Security Considerations

1. **Authentication & Authorization**

   - Implement secure authentication flows
   - Use proper authorization checks
   - Validate user inputs client-side and server-side

2. **Data Protection**

   - Encrypt sensitive data
   - Implement proper session management
   - Use secure communication (HTTPS)

3. **ICP Canister Security**
   - Follow ICP security best practices
   - Implement proper canister access controls
   - Regularly update dependencies
   - Test for common web vulnerabilities

## Support and Resources

- GitHub Issues: Technical problems and bug reports
- Telegram Community: General discussion and support
- Documentation: Comprehensive guides and references
- Security: Private disclosure process for vulnerabilities
- ICP Network Status: Check the Internet Computer Protocol status at https://dashboard.internetcomputer.org/
- Electroneum Blockchain Explorer: For monitoring contract transactions

For additional support or questions:

1. Check existing documentation
2. Search closed issues
3. Join Telegram community
4. Contact @devbigeazi

## All tests passed

<img width="641" alt="test" src="https://github.com/user-attachments/assets/41e09d25-3162-4012-8b0b-d7a7cfca2677" />
>>>>>>> e0c61ebb534ba38a2aac8f98678e996f48fff2e9
