# Contributing to osid

Thank you for your interest in contributing to `osid`! We welcome community contributions to help improve this high-performance ID generator.

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful, welcoming, and collaborative environment.

---

## How Can I Contribute?

### 1. Reporting Bugs
- Check the active issue tracker to ensure the bug hasn't already been reported.
- If it's a new issue, open a bug report explaining:
  - The expected behavior.
  - The actual behavior.
  - Steps to reproduce (including code snippets, Node.js or browser environment version).

### 2. Suggesting Enhancements
- Open a feature request explaining what capability you would like to see, why it is beneficial, and how it might be implemented.

### 3. Submitting Pull Requests (PRs)
- Fork the repository and create your branch from `main`.
- Install the development dependencies:
  ```bash
  npm install
  ```
- Make sure tests are passing before starting work:
  ```bash
  npm run test
  ```
- Add unit tests for any new behavior or bug fixes in `tests/osid.test.ts`.
- Verify code compilation and declaration outputs:
  ```bash
  npm run build
  ```
- Commit your changes with clear, descriptive commit messages.
- Submit a PR targeting the `main` branch.

---

## Development Guidelines

- **Zero Runtime Dependencies**: The core package must remain extremely lightweight and have zero production dependencies.
- **Cross-Platform Compatibility**: Always ensure utilities run safely on both Node.js and Browser environments.
- **Strict Typing**: Maintain strict TypeScript typing. Do not bypass the compiler type safety rules.
- **Deterministic Monotonicity**: Any modifications to the timestamping or sequence counters must strictly preserve chronological order and collision-freedom.
