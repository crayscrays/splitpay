import "dotenv/config";
import { createAgent } from "@0xchat/miniapp-sdk";
import {
  handleHelp,
  handleCreate,
  handleLink,
  handleJoin,
  handleStatus,
  handleAdd,
  handleExpenses,
  handleBalance,
  handleDebts,
  handleSettle,
  handlePaymentComplete,
} from "./commands.js";
import type { MessageContext, PaymentContext } from "@0xchat/miniapp-sdk";

const agent = createAgent({
  apiKey: process.env.OXCHAT_API_KEY!,
  webhookSecret: process.env.OXCHAT_WEBHOOK_SECRET!,
});

agent.on("joined", async (ctx) => {
  await ctx.reply(
    "👋 SplitPay bot joined! I help track shared expenses.\n\nType /help to see available commands."
  );
});

agent.on("removed", async (_ctx) => {
  // nothing to do on removal
});

agent.on("message", async (ctx: MessageContext) => {
  let content = ctx.content.trim();

  // Strip leading @mention prefix, e.g. "@SplitPay /add 50 dinner"
  content = content.replace(/^@\S+\s*/, "").trim();

  if (!content.startsWith("/")) return;

  const spaceIdx = content.indexOf(" ");
  const cmd = (spaceIdx === -1 ? content.slice(1) : content.slice(1, spaceIdx)).toLowerCase();
  const args = spaceIdx === -1 ? "" : content.slice(spaceIdx + 1).trim();

  switch (cmd) {
    case "help":
      await handleHelp(ctx);
      break;
    case "create":
      await handleCreate(args, ctx);
      break;
    case "link":
      await handleLink(args, ctx);
      break;
    case "join":
      await handleJoin(args, ctx);
      break;
    case "status":
    case "info":
      await handleStatus(ctx);
      break;
    case "add":
      await handleAdd(args, ctx);
      break;
    case "expenses":
    case "history":
    case "list":
      await handleExpenses(args, ctx);
      break;
    case "balance":
    case "balances":
      await handleBalance(ctx);
      break;
    case "debts":
    case "debt":
    case "owes":
      await handleDebts(ctx);
      break;
    case "settle":
    case "settleup":
    case "pay":
      await handleSettle(ctx);
      break;
    default:
      await ctx.reply(`Unknown command "/${cmd}". Type /help to see available commands.`);
  }
});

agent.on("payment_complete", async (ctx: PaymentContext) => {
  await handlePaymentComplete(ctx);
});

const PORT = Number(process.env.PORT) || 3000;
agent.listen(PORT);
console.log(`SplitPay agent listening on port ${PORT}`);
