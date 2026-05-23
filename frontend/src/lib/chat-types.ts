export type DocStatus = "have" | "obtain" | "generate";

export type DocItem = {
  name: string;
  status: DocStatus;
  institution?: string;
  address?: string;
  form_type?: string;
};
