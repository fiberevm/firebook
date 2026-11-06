import ApiKeysService from "./api_keys";
import AuthService from "./auth";
import CurrenciesService from "./currencies";
import EntriesService from "./entries";
import OidcService from "./oidc";
import OrganizationsService from "./organizations";
import UsersService from "./users";
import TagsService from "./tags";

type Services = {
  apiKeys: ApiKeysService;
  auth: AuthService;
  currencies: CurrenciesService;
  oidc: OidcService;
  organizations: OrganizationsService;
  entries: EntriesService;
  tags: TagsService;
  users: UsersService;
};

export function services(): Services {
  return {
    apiKeys: new ApiKeysService(),
    auth: new AuthService(),
    currencies: new CurrenciesService(),
    users: new UsersService(),
    oidc: new OidcService(),
    organizations: new OrganizationsService(),
    tags: new TagsService(),
    entries: new EntriesService(),
  };
}
