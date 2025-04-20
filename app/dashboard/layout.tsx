import { AppSidebar } from "@/components/app-sidebar";
import { NavUser } from "@/components/nav-user";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Fragment, PropsWithChildren } from "react";
import { redirect } from "next/navigation";

// Remove the static data object

export default async function Layout({children}:PropsWithChildren) {
  const supabase = await createClient();
  const headersList = await headers();
  const currentPath = headersList.get("x-invoke-path") || "/dashboard";
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    redirect('/login');
  }

  // Convert path to breadcrumb segments with accumulated paths
  const segments = currentPath
    .split('/')
    .filter(Boolean)
    .reduce((acc, segment, index, arr) => {
      const path = arr.slice(0, index + 1).join('/');
      acc.push({
        label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
        href: `/${path}`
      });
      return acc;
    }, [] as Array<{ label: string; href: string }>);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {segments.map((segment, index) => (
                  <Fragment key={segment.href}>
                    {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                    <BreadcrumbItem className="hidden md:block">
                      {index === segments.length - 1 ? (
                        <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={segment.href}>
                          {segment.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <NavUser user={{
            ...session.user,
            name: session.user.user_metadata?.full_name || session.user.email,
            avatar: session.user.user_metadata?.avatar_url || '',
            email: session.user.email || ''
          }} />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 h-full">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
